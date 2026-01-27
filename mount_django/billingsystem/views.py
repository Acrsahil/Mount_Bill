import json
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal
from uuid import UUID

from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import F,Sum,Max
from django.http import JsonResponse
from django.shortcuts import get_list_or_404, get_object_or_404, render
from django.utils import timezone
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from .models import (
    AdditionalCharges,
    Bill,
    Customer,
    ItemActivity,
    OrderList,
    OrderSummary,
    Product,
    ProductCategory,
    RemainingAmount,
    PaymentIn,
    PaymentOut,
    BalanceAdjustment,
    Expense,
    ExpenseCategory,
    Purchase,
)
from .signals import DEFAULT_CATEGORIES


@login_required
def filtered_products(request):
    user = request.user
    company = user.owned_company or user.active_company

    if not company:
        return JsonResponse({"products": []})

    products = Product.objects.all()
    category_id = request.GET.get("category")
    stock_status = request.GET.get("stock")

    if category_id:
        products = products.filter(category__id=category_id).order_by("-date_added")

    if stock_status == "instock":
        products = products.filter(product_quantity__gt=0).order_by("-date_added")
    elif stock_status == "lowstock":
        products = products.filter(product_quantity__lte=F("low_stock_bar")).order_by(
            "-date_added"
        )
    elif stock_status == "outstock":
        products = products.filter(product_quantity__lte=0).order_by("-date_added")
    products_data = [
        {
            "id": p.id,
            "uid": str(p.uid),
            "name": p.name,
            "category": p.category.name if p.category else "N/A",
            "cost_price": float(p.cost_price),
            "selling_price": float(p.selling_price),
            "quantity": p.product_quantity,
        }
        for p in products
    ]
    return JsonResponse({"products": products_data})

@login_required
def category_json(request):
    user = request.user
    company = user.owned_company or user.active_company

    if not company:
        return JsonResponse({"categories": []})
    categories = ProductCategory.objects.filter(company=company).order_by("-id")
    categories = [
        {
            "id": c.id,
            "name": c.name,
        }
        for c in categories
    ]

    return JsonResponse({"categories": categories})


@require_GET
@never_cache
def products_json(request):
    user = request.user
    company = user.owned_company or user.active_company

    if not company:
        return JsonResponse({"products": [], "count": 0})

    products = (
        Product.objects.filter(company=company)
        .select_related("category")
        .order_by("-date_added")
    )

    products_data = [
        {
            "id": p.id,
            "uid": str(p.uid),
            "name": p.name,
            "category": p.category.name if p.category else "N/A",
            "cost_price": float(p.cost_price),
            "selling_price": float(p.selling_price),
            "quantity": p.product_quantity,
        }
        for p in products
    ]

    return JsonResponse({"products": products_data, "count": products.count()})

@login_required
@never_cache
def clients_json(request):
    user = request.user
    company = user.owned_company or user.active_company

    if not company:
        return JsonResponse({"clients": [], "count": 0})

    clients =Customer.objects.filter(company=company).order_by('-date')
    

    clients_data = [
        {
            "id": c.id,
            "uid": str(c.uid),
            "name": c.name,
            "phone": c.phone,
            "email": c.email,
            "pan_id": c.pan_id,
            "address": c.address,
        }
        for c in clients
    ]

    return JsonResponse({"clients": clients_data, "client_count": clients.count()})

@login_required
def client_info_payment_id(request,id: UUID):
    user = request.user
    company = user.owned_company or user.active_company
    if not company:
        return JsonResponse({"client": [],"payment_id": 0})
    # for client name 
    client = Customer.objects.get(uid = id)
    
    remaining = RemainingAmount.objects.filter(customer__uid = id).order_by('-id').first()
    oldest_remaining = RemainingAmount.objects.filter(customer__uid = id).order_by('id').first()
    client_name = client.name
    client_address = client.address
    client_phone = client.phone
    client_date = client.date
    # latest payment id
    latest_payment_id = PaymentIn.objects.aggregate(latest_id=Max('id'))['latest_id'] or 0

    # latest payment out id
    latest_paymentout_id = PaymentOut.objects.aggregate(latest_id=Max('id'))['latest_id'] or 0

    return JsonResponse({"client_name":client_name,"latest_payment_id":latest_payment_id,"latest_paymentout_id":latest_paymentout_id,"remaining":remaining.remaining_amount,
                         "client_address":client_address,
                         "client_phone":client_phone,
                         "oldest_remaining":oldest_remaining.remaining_amount,
                         "date":client_date,
                         })
    

def get_serialized_data(user, active_tab="dashboard"):
    """Helper function to get serialized data for template"""
    company = None
    company = user.owned_company or user.active_company
    products = Product.objects.select_related("category").filter(company=company)
    customers = Customer.objects.filter(company=company)
    categories = ProductCategory.objects.filter(company=company)
    orderlist = OrderList.objects.filter(company=company)

    invoice_data = []
    for order in orderlist:
        if hasattr(OrderSummary, "objects"):
            summary = OrderSummary.objects.filter(order=order).first()
            if summary:
                invoice_data.append(
                    {
                        "id": order.id,
                        "uid": str(order.uid),
                        "number": f"INV-00{order.id}",
                        "client": order.customer.name,
                        "issueDate": order.order_date.date().isoformat(),
                        # Convert Decimal to float
                        "amount": float(summary.total_amount),
                        "status": "pending",
                    }
                )

    products_data = [
        {
            "id": p.id,
            "uid": str(p.uid),
            "name": p.name,
            "cost_price": float(p.cost_price),
            "selling_price": float(p.selling_price),
            "quantity": p.product_quantity,
            "category": p.category.name if p.category else "",
        }
        for p in products
    ]

    customers_data = [
        {
            "uid": str(c.uid),
            "id": c.id,
            "name": c.name,
            "phone": c.phone,
            "email": c.email,
            "address": c.address,
            "customer_type":c.customer_type,
        }
        for c in customers
    ]
    categories_data = [{"id": cat.id, "name": cat.name} for cat in categories]

    return {
        "product": json.dumps(products_data),
        "product_count": len(products_data),
        "customer": json.dumps(customers_data),
        "product_cat": json.dumps(categories_data),
        "invoices": json.dumps(invoice_data),
        "active_tab": active_tab,
    }


@login_required
def dashboard(request):
    """Main billing page view - SIMPLIFIED"""
    try:
        # Get both common context and serialized data
        context = get_serialized_data(
            request.user, "dashboard"
        )  # Set active_tab="dashboard"
        # serialized_data = get_serialized_data()

        # # Merge both dictionaries
        # context.update(serialized_data)
        return render(request, "website/bill.html", context)
    except Exception as e:
        print(f"Error in dashboard view: {e}")
        return render(
            request,
            "website/bill.html",
            {
                "product": "[]",
                "customer": "[]",
                "product_cat": "[]",
                "invoices": "[]",
                "active_tab": "dashboard",
            },
        )


@login_required
@require_POST
@transaction.atomic
def save_product(request):
    """Save new product via AJAX - COMPATIBLE VERSION"""
    try:
        data = json.loads(request.body)
        name = data.get("name", "").strip()
        category_name = data.get("category", "").strip()

        # Handle both old and new price formats
        cost_price = data.get("cost_price")
        selling_price = data.get("selling_price")
        quantity = data.get("quantity")
        lowStockQuantity = data.get("lowStockQuantity")
        user = request.user
        print("low stock quantity", lowStockQuantity)
        company = None
        company = user.owned_company or user.active_company

        if not company:
            return JsonResponse({"success": False, "error": "No company for the user"})
        # If using old format with single 'price' field

        if cost_price is None and selling_price is None and "price" in data:
            cost_price = data.get("price")
            selling_price = data.get("price")  # Use same price for both

        # Rest of your validation code remains the same...
        if not name:
            return JsonResponse(
                {"success": False, "error": "Product name is required"}, status=400
            )

        if cost_price is None or selling_price is None:
            return JsonResponse(
                {
                    "success": False,
                    "error": "Both cost price and selling price are required",
                },
                status=400,
            )

        try:
            cost_price = float(cost_price)
            selling_price = float(selling_price)
            quantity = int(quantity)

            if quantity < 0:
                return JsonResponse(
                    {
                        "success": False,
                        "error": "Product quantity cannot be 0 or less.",
                    },
                    status=400,
                )

            if cost_price <= 0 or selling_price <= 0:
                return JsonResponse(
                    {"success": False, "error": "Prices must be positive"}, status=400
                )
            if selling_price < cost_price:
                return JsonResponse(
                    {
                        "success": False,
                        "error": "Selling price cannot be less than cost price",
                    },
                    status=400,
                )
        except (TypeError, ValueError):
            return JsonResponse(
                {"success": False, "error": "Valid prices are required"}, status=400
            )

        # Check for existing product
        if Product.objects.filter(name__iexact=name, company=company).exists():
            return JsonResponse(
                {"success": False, "error": "Product already exists"}, status=400
            )

        # Get or create category

        category = None
        if category_name:
            category, _ = ProductCategory.objects.get_or_create(
                name=category_name, company=company
            )

            # Create product
        product = Product(
            name=name,
            cost_price=cost_price,
            selling_price=selling_price,
            category=category,
            product_quantity=quantity,
            company=company,
            low_stock_bar=lowStockQuantity,
        )

        item_activity = ItemActivity(
            product=product,
            type="Add Stock",
            change=f"+{quantity}",
            quantity=quantity,
            remarks="Opening Stock",
        )

        try:
            product.save()
            item_activity.save()
        except Exception:
            transaction.set_rollback(True)
            return JsonResponse(
                {"success": False, "error": "Can't Save Data in Database"},
                status=400,
            )
        item_activity = [
            {
                "id": item_activity.id,
                "type": item_activity.type,
                "date": item_activity.date.isoformat(),
                "change": f"+{item_activity.change}",
                "quantity": item_activity.quantity,
                "remarks": item_activity.remarks,
                "order_id": item_activity.order.id if item_activity.order else None,
            }
        ]
        return JsonResponse(
            {
                "success": True,
                "message": "Product saved successfully!",
                "product": {
                    "id": product.id,
                    "uid": str(product.uid),
                    "name": product.name,
                    "cost_price": float(product.cost_price),
                    "selling_price": float(product.selling_price),
                    "category": product.category.name if product.category else "",
                    "quantity": product.product_quantity,
                },
                "itemactivity": item_activity,
            }
        )

    except Exception as e:
        print(f"Server error in save_product: {str(e)}")
        return JsonResponse(
            {"success": False, "error": f"Server error: {str(e)}"}, status=500
        )


@login_required
@require_POST
@transaction.atomic
def update_product(request, id):
    try:
        data = json.loads(request.body)

        product_id = data.get("id")
        name = data.get("name", "").strip()
        category_name = data.get("category", "").strip()
        cost_price = data.get("cost_price")
        selling_price = data.get("selling_price")
        lowStock = data.get("lowStock")
        product = Product.objects.get(id=product_id)

        if category_name:
            category_obj, created = ProductCategory.objects.get_or_create(
                name=category_name, company=product.company
            )
            product.category = category_obj
        else:
            product.category = None

        product.name = name
        product.cost_price = cost_price
        product.selling_price = selling_price
        product.low_stock_bar = lowStock
   
        product.save()
        return JsonResponse(
            {
                "success": True,
                "message": "Product updated successfully",
                "product": {
                    "id": product.id,
                    "name": product.name,
                    "cost_price": float(product.cost_price),
                    "selling_price": float(product.selling_price),
                    "category": product.category.name if product.category else "",
                    "quantity": product.product_quantity,
                },
            }
        )

    except Exception as e:
        print("Update product error:", e)
        return JsonResponse(
            {"success": False, "error": f"Server error: {str(e)}"}, status=500
        )


@login_required
@require_POST
@transaction.atomic
def add_stock(request, id):
    try:
        data = json.loads(request.body)
        product_id = data.get("id")
        stock = int(data.get("stock_to_add"))
        remark = data.get("remarks")
        product = Product.objects.get(id=product_id)
        product.product_quantity += stock

        item_activity = ItemActivity(
            product=product,
            type="Add Stock",
            change=f"+{stock}",
            quantity=product.product_quantity,
            remarks=remark,
        )
        product.save()
        item_activity.save()
        item_activity = [
            {
                "id": item_activity.id,
                "type": item_activity.type,
                "date": item_activity.date.isoformat(),
                "change": item_activity.change,
                "quantity": item_activity.quantity,
                "remarks": item_activity.remarks,
                "order_id": item_activity.order.id if item_activity.order else None,
            }
        ]
        return JsonResponse(
            {
                "success": True,
                "message": "Stock updated successfully",
                "product": {"id": product.id, "quantity": product.product_quantity},
                "itemactivity": item_activity,
            }
        )
    except Exception as e:
        print("Update product error:", e)
        return JsonResponse(
            {"success": False, "error": f"Server error: {str(e)}"}, status=500
        )


@login_required
@require_POST
@transaction.atomic
def reduce_stock(request, id):
    try:
        data = json.loads(request.body)
        product_id = data.get("id")
        stock = int(data.get("stock_to_remove"))
        remark = data.get("remarks")
        product = Product.objects.get(id=product_id)
        product.product_quantity -= stock
        
        item_activity = ItemActivity(
            product=product,
            type="Reduce Stock",
            change=-stock,
            quantity=product.product_quantity,
            remarks=remark,
        )
        product.save()
        item_activity.save()
    
        item_activity = [
            {
                "id": item_activity.id,
                "type": item_activity.type,
                "date": item_activity.date.isoformat(),
                "change": item_activity.change,
                "quantity": item_activity.quantity,
                "remarks": item_activity.remarks,
                "order_id": item_activity.order.id if item_activity.order else None,
            }
        ]
        return JsonResponse(
            {
                "success": True,
                "message": "Stock updated successfully",
                "product": {
                    "id": product.id,
                    "quantity": product.product_quantity,
                },
                "itemactivity": item_activity,
            }
        )
    except Exception as e:
        print("Update product error:", e)
        return JsonResponse(
            {"success": False, "error": f"Server error: {str(e)}"}, status=500
        )


@login_required
@require_POST
@transaction.atomic
def save_invoice(request):
    """Save complete invoice via AJAX - REMOVED REDUNDANT CODE"""
    try:
        data = json.loads(request.body)
     
        client_name = data.get("clientName", "").strip()
        invoice_date_str = data.get("invoiceDate", "")
        invoice_items = data.get("items", [])
        global_discount = float(data.get("globalDiscountPercent", 0))

        global_tax = float(data.get("globalTaxPercent", 0))
        additional_charges = float(data.get("additionalCharges", 0))
        charge_name_amount = data.get("additionalchargeName", [])
        notes_here = data.get("noteshere", "").strip()
        received_amount = float(data.get("receivedAmount"))

        # total_amount = float(data.get("totalAmount"))
        user = request.user

        # print(f"total amount ko value:{total_amount}")
        company = None
        company = user.owned_company or user.active_company

        if not company:

            return JsonResponse(
                {
                    "success": False,
                    "error": "You are not associated with any company. Please contact your administrator.",
                },
            )

        # Consolidated validation
        if not client_name:
            return JsonResponse(
                {"success": False, "error": "Client name is required"}, status=400
            )

        if not invoice_items:
            return JsonResponse(
                {"success": False, "error": "At least one item is required"}, status=400
            )

        # Find or create customer

        customer, created = Customer.objects.get_or_create(
            name=client_name,
            defaults={
                "phone": "000-000-0000",
            },
        )

        # Handle date conversion
        if invoice_date_str:
            try:
                invoice_date = datetime.strptime(invoice_date_str, "%Y-%m-%d")
                # Keep current time instead of 00:00:00
                now = timezone.now()
                invoice_date = invoice_date.replace(hour=now.hour, minute=now.minute, second=now.second, microsecond=now.microsecond)
                invoice_date = timezone.make_aware(invoice_date)
            except ValueError:
                invoice_date = timezone.now()
        else:
            invoice_date = timezone.now()

        # Create order
        order = OrderList.objects.create(
            company=company,
            customer=customer,
            order_date=invoice_date,
            notes=notes_here,
        )

        # Process invoice items
        total_amount = 0
        for item in invoice_items:
            product_name = item.get("productName", "").strip()
            quantity = int(item.get("quantity", 1))
            discount = float(item.get("discount"))
            
            price = float(item.get("price", 0))
            discountPercent = float(item.get("discountPercent", 0))

            if not product_name:
                continue

            # Find or create product - use selling price as default
            default_category = ProductCategory.objects.first()
            if not default_category:
                default_category = ProductCategory.objects.create(name="General")

            product, _ = Product.objects.get_or_create(
                name=product_name,
                defaults={
                    # Default cost price (80% of selling)
                    # "cost_price": price * 0.8,
                    "selling_price": price,
                    "category": default_category,
                },
            )

            # Create bill entry
            Bill.objects.create(
                order=order,
                purchase = None,
                product=product,
                quantity=quantity,
                discount=discountPercent,
                product_price=Decimal(
                    str(price)
                ),  # Convert to Decimal    quantity=quantity,
                bill_date=timezone.now(),
            )

            total_amount += (quantity * price) - (
                (quantity * price) * (discountPercent / 100)
            )

            new_qty = product.product_quantity - quantity
            ItemActivity.objects.create(
                order=order,
                type=f"sale invoice #{order.id}",
                product=product,
                change=-quantity,
                quantity=product.product_quantity - quantity,
                remarks=notes_here,
            )

            print("This is product Id::", product.id)

            change_product = Product.objects.get(id=product.id)
            change_product.product_quantity = new_qty
            print("this is change_product Qty...", change_product.product_quantity)
            change_product.save()

        # grand total amount
        final_amount = total_amount - (global_discount / 100) * total_amount

        final_amount += additional_charges
        final_amount = Decimal(final_amount).quantize(
            Decimal("0.00"), rounding=ROUND_HALF_UP
        )

        for charge in charge_name_amount:
            charge_name = charge.get("chargeName")
            charge_amount = charge.get("chargeAmount")
            # creating additional entry
            AdditionalCharges.objects.create(
                additional_charges=order,
                charge_name=charge_name,
                additional_amount=charge_amount,
            )

        print(total_amount)

        current_remaining = Decimal(str(final_amount)) - Decimal(str(received_amount))
        # print(remaining_amount)

        print("this is global_discount-> ", global_discount)

        # ---------- CHANGED PART STARTS HERE ----------
        # Build OrderSummary (not saved yet)
        order_summary = OrderSummary(
            order=order,
            total_amount=Decimal(str(total_amount)),
            final_amount=Decimal(str(final_amount)),
            discount=Decimal(str(global_discount)),
            tax=Decimal(str(global_tax)),
            received_amount=Decimal(str(received_amount)),
            due_amount=current_remaining,
        )

        try:
            order_summary.full_clean()
            # validate against max_digits, etc.

            order_summary.save()
        except ValidationError as e:
            transaction.set_rollback(True)
            return JsonResponse(
                {
                    "success": False,
                    "error": "Validation error",
                    "field_errors": e.message_dict,
                },
                status=400,
            )
        # ---------- CHANGED PART ENDS HERE ----------

        # calculating remaining amount

        # Calculate this order's remaining amount
        
        
        latest_remaining = RemainingAmount.objects.filter(customer=customer).order_by('-id').first()
        previous_remaining = latest_remaining.remaining_amount if latest_remaining else 0
        

        # Add previous remaining to this order's remaining
        total_remaining_for_order = current_remaining + Decimal(previous_remaining)

        # Save remaining amount for this order
        remaining_obj, created = RemainingAmount.objects.get_or_create(
            customer=customer,
            orders=order,
            defaults={"remaining_amount": total_remaining_for_order}
        )

        if not created:
            remaining_obj.remaining_amount = total_remaining_for_order
            remaining_obj.save()

        return JsonResponse(
            {
                "success": True,
                "message": "Invoice saved successfully!",
                "invoice": {
                    "id": order.id,
                    "number": f"INV-{order.id:03d}",
                    "client": customer.name,
                    "date": order.order_date.isoformat(),
                    "total_amount": order_summary.total_amount,
                    "items_count": len(invoice_items),
                },
            }
        )

    except json.JSONDecodeError as e:
        return JsonResponse(
            {"success": False, "error": f"Invalid JSON: {str(e)}"}, status=400
        )
    except Exception as e:
        print(f"Error in save_invoice: {str(e)}")
        return JsonResponse(
            {"success": False, "error": f"Server error: {str(e)}"}, status=500
        )

@login_required
@require_POST
@transaction.atomic
def save_purchase(request):
    try:
        data = json.loads(request.body)
     
        client_name = data.get("clientName", "").strip()
        purchase_date_str = data.get("purchaseDate", "")
        purchase_items = data.get("items", [])
        global_discount = Decimal(str(data.get("globalDiscountPercent", 0)))

        global_tax = Decimal(str(data.get("globalTaxPercent", 0)))
        additional_charges = Decimal(str(data.get("additionalCharges", 0)))
        charge_name_amount = data.get("additionalchargeName", [])
        notes_here = data.get("noteshere", "").strip()
        received_amount = Decimal(str(data.get("receivedAmount",0)))

        user = request.user
        company = None
        company = user.owned_company or user.active_company

        if not company:
            return JsonResponse(
                {
                    "success": False,
                    "error": "You are not associated with any company. Please contact your administrator.",
                },
            )
        if not client_name:
            return JsonResponse(
                {"success": False, "error": "Client name is required"}, status=400
            )

        if not purchase_items:
            return JsonResponse(
                {"success": False, "error": "At least one item is required"}, status=400
            )
        customer, created = Customer.objects.get_or_create(
            name=client_name,
            defaults={
                "phone": "000-000-0000",
            },
        )

        # Handle date conversion
        if purchase_date_str:
            try:
                purchase_date = datetime.strptime(purchase_date_str, "%Y-%m-%d")
                # Keep current time instead of 00:00:00
                now = timezone.now()
                purchase_date = purchase_date.replace(hour=now.hour, minute=now.minute, second=now.second, microsecond=now.microsecond)
                purchase_date = timezone.make_aware(purchase_date)
            except ValueError:
                purchase_date = timezone.now()
        else:
            purchase_date = timezone.now()

        purchases = Purchase.objects.create(
                    company=company,
                    customer=customer,
                    summary = None,
                    remaining = None,
                    date=purchase_date,
                    notes=notes_here)

        # Process invoice items
        total_amount = 0
        for item in purchase_items:
            product_name = item.get("productName", "").strip()
            quantity = int(item.get("quantity", 1))
            
            price = Decimal(str(item.get("price", 0)))
            discountPercent = Decimal(str(item.get("discountPercent", 0)))

            if not product_name:
                continue

            # Find or create product - use selling price as default
            default_category = ProductCategory.objects.first()
            if not default_category:
                default_category = ProductCategory.objects.create(name="General")

            product, _ = Product.objects.get_or_create(
                name=product_name,
                defaults={
                    "selling_price": price,
                    "category": default_category,
                },
            )

            # Create bill entry
            Bill.objects.create(
                order=None,
                purchase = purchases,
                product=product,
                quantity=quantity,
                discount=discountPercent,
                product_price=Decimal(
                    str(price)
                ),  # Convert to Decimal    quantity=quantity,
                bill_date=timezone.now(),
            )

            total_amount += (quantity * price) - (
                (quantity * price) * (discountPercent / 100)
            )

            new_qty = product.product_quantity + quantity
            ItemActivity.objects.create(
                purchase=purchases,
                type=f"Purchase #{purchases.id}",
                product=product,
                change=f"+{quantity}",
                quantity=product.product_quantity + quantity,
            )


            change_product = Product.objects.get(id=product.id)
            change_product.product_quantity = new_qty
            change_product.save()

        for charge in charge_name_amount:
            charge_name = charge.get("chargeName")
            charge_amount = charge.get("chargeAmount")
            # creating additional entry
            AdditionalCharges.objects.create(
                additional_charges=None,
                purchase_additional_charges =  purchases,
                charge_name=charge_name,
                additional_amount=charge_amount,
            )
        # grand total amount
        final_amount = total_amount - (global_discount / 100) * total_amount
        tax_amount = final_amount * (global_tax)
        final_amount += tax_amount

        final_amount += additional_charges
        final_amount = Decimal(final_amount).quantize(
            Decimal("0.00"), rounding=ROUND_HALF_UP
        )

        current_remaining = Decimal(str(final_amount)) - Decimal(str(received_amount))

        # ---------- CHANGED PART STARTS HERE ----------
        # Build OrderSummary (not saved yet)
        order_summary = OrderSummary(
            order=None,
            total_amount=Decimal(str(total_amount)),
            final_amount=Decimal(str(final_amount)),
            discount=Decimal(str(global_discount)),
            tax=Decimal(str(global_tax)),
            received_amount=Decimal(str(received_amount)),
            due_amount=current_remaining,
        )

        try:
            order_summary.full_clean()
                # validate against max_digits, etc.

            order_summary.save()
            purchases.summary = order_summary
            purchases.save()

        except Exception as e:
        
            return JsonResponse(
                    {
                        "success": False,
                        "error": "Validation error",
                        "field_errors": e.message_dict,
                    },
                    status=400,
                )
        # ---------- CHANGED PART ENDS HERE ----------
        
        latest_remaining = RemainingAmount.objects.filter(customer=customer).order_by('-id').first()
        previous_remaining = latest_remaining.remaining_amount if latest_remaining else 0
        

        # subtract this order's remaining to previous remaining
        total_remaining_after_purchase = Decimal(previous_remaining) - current_remaining

        # Save remaining amount for this order
        remaining_obj = RemainingAmount.objects.create(
            customer=customer,
            remaining_amount = total_remaining_after_purchase,
        )
        purchases.remaining = remaining_obj
        purchases.save()
        

        return JsonResponse(
            {
                "success": True,
                "message": "Purchase bill saved successfully!",
            }
        )

    except json.JSONDecodeError as e:
        return JsonResponse(
            {"success": False, "error": f"Invalid JSON: {str(e)}"}, status=400
        )
    except Exception as e:
        print(f"Error in save_purchase: {str(e)}")
        return JsonResponse(
            {"success": False, "error": f"Server error: {str(e)}"}, status=500
        )


@login_required
def purchase_layout(request, id):
    if request.method == "GET":
        try:
            purchases = Purchase.objects.get(uid=id)

            # Check if order_list exists
            if not purchases:
                return JsonResponse(
                    {
                        "success": False,
                        "error": "Purchase not found",
                        "message": f"No purchase found with ID: {id}",
                    },
                    status=404,
                )

            bill_info = Bill.objects.filter(purchase=purchases)
            additionalcharge_info = AdditionalCharges.objects.filter(
                purchase_additional_charges=purchases
            )
            note = purchases.notes

            # Get basic order information with null checks
            customer_name = purchases.customer.name if purchases.customer else "N/A"
            customer_address = (
                purchases.customer.address if purchases.customer else "N/A"
            )
            customer_Pan_id = (
                purchases.customer.pan_id
                if purchases.customer and purchases.customer.pan_id
                else "N/A"
            )
            purchase_date = purchases.date
            company_phone = purchases.company.phone if purchases.company else "N/A"
            customer_phone = purchases.customer.phone if purchases.customer else "N/A"
            company_name = purchases.company.name if purchases.company else "N/A"
            purchase_id = purchases.id
            uuid = purchases.uid

            # Get summary information
            
            total_amount = purchases.summary.total_amount if purchases.summary.total_amount else 0
            global_tax_percent = purchases.summary.tax if purchases.summary.tax else 0
            global_discount_percent = purchases.summary.discount if purchases.summary.discount else 0
            received_amount = (
                        purchases.summary.received_amount if purchases.summary.received_amount else 0
                    )
            amount_due = purchases.summary.due_amount if purchases.summary.due_amount else 0
            final_amount = purchases.summary.final_amount if purchases.summary.final_amount else 0

            # Calculate derived amounts
            dis_amount = (
                (global_discount_percent / 100) * total_amount if global_discount_percent else 0
            )
            tax_amount = (
                (global_tax_percent / 100) * (total_amount - dis_amount) if global_tax_percent else 0
            )

            # Prepare items list
            items = []
            if bill_info.exists():
                for bill in bill_info:
                    # Check if product exists
                    if bill.product:
                        per_discount = (
                            (
                                Decimal((bill.quantity) * Decimal(bill.product_price))
                                * Decimal((bill.discount) / Decimal("100"))
                            ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                            if bill.discount
                            else 0
                        )
                        item = {
                            "id": bill.id,
                            "product_id": bill.product.id,
                            "product_name": bill.product.name
                            if bill.product.name
                            else "Unknown Product",
                            "quantity": bill.quantity if bill.quantity else 0,
                            "rate": float(bill.product_price)
                            if bill.product_price
                            else 0,
                            "discount": bill.discount if bill.discount else 0,
                            "product_price": float(bill.product_price)
                            if bill.product_price
                            else 0,
                            "perDiscount": per_discount,
                            "line_total": (
                                Decimal(bill.product_price) * Decimal(bill.quantity)
                            )
                            - per_discount
                            if bill.product_price and bill.quantity
                            else 0,
                            "discount_percent": 0,
                            "discount_amount": 0,
                        }
                    else:
                        item = {
                            "id": bill.id,
                            "product_id": None,
                            "product_name": "Product not found",
                            "quantity": bill.quantity if bill.quantity else 0,
                            "rate": 0,
                            "product_price": 0,
                            "line_total": 0,
                            "discount_percent": 0,
                            "discount_amount": 0,
                        }
                    items.append(item)

            # Prepare additional charges
            additional_charges = []
            if additionalcharge_info.exists():
                for charge in additionalcharge_info:
                    charge_data = {
                        "charge_name": charge.charge_name
                        if charge.charge_name
                        else "Additional Charge",
                        "charge_amount": float(charge.additional_amount)
                        if charge.additional_amount
                        else 0,
                        "charge_type": getattr(charge, "charge_type", "additional"),
                    }
                    additional_charges.append(charge_data)

            # Build response data
            response_data = {
                "success": True,
                "invoice": {
                    "id": purchases.id,
                    "uuid": uuid,
                    "invoice_number": f"BILL-{purchase_id:03d}",
                    "company_name": company_name,
                    "company_phone": company_phone,
                    "company_address": "Gokarneshwor-4, Kathmandu",
                    "customer": {
                        "name": customer_name,
                        "address": customer_address,
                        "phone": customer_phone,
                        "pan_id": customer_Pan_id,
                    },
                    "dates": {
                        "invoice_date": purchase_date.strftime("%Y-%m-%d")
                        if purchase_date
                        else None,
                        "invoice_date_formatted": purchase_date.strftime("%Y %b %d")
                        if purchase_date
                        else "N/A",
                    },
                    "amounts": {
                        "subtotal": float(total_amount),
                        "total_amount": float(total_amount),
                        "global_tax_percent": float(global_tax_percent),
                        "global_tax_amount": float(tax_amount),
                        "global_discount_percent": float(global_discount_percent),
                        "global_discount_amount": float(dis_amount),
                        "final_amount": float(final_amount),
                        "received_amount": float(received_amount),
                        "amount_due": float(amount_due),
                        "balance": float(amount_due),
                    },
                    "payment_info": {
                        "payment_mode": "Cash",
                        "status": "Paid" if amount_due == 0 else "Pending",
                    },
                    "items": items,
                    "additional_charges": additional_charges,
                    "remarks": note,
                },
            }

            return JsonResponse(response_data, safe=False)

        except Purchase.DoesNotExist:
            return JsonResponse(
                {
                    "success": False,
                    "error": "Purchase not found",
                    "message": f"No purchase found with ID: {id}",
                },
                status=404,
            )

        except Exception as e:
            # Log the full error for debugging
            import traceback

            error_details = traceback.format_exc()
            print(f"Error in purchase_layout: {e}")
            print(f"Traceback: {error_details}")

            return JsonResponse(
                {
                    "success": False,
                    "error": "Server error",
                    "message": str(e),
                    "details": "Check if all related objects (customer, company, product) exist in database",
                },
                status=500,
            )

    return JsonResponse(
        {
            "success": False,
            "error": "Method not allowed",
            "message": "Only GET method is allowed",
        },
        status=405,
    )


@login_required
def purchase_info(request):
    try:
        user = request.user
        company = user.owned_company or user.active_company
        if not company:
            return JsonResponse({"expense_data": [], "expense_count": 0})
      
    
        purchases = Purchase.objects.filter(company=company).order_by('-date')
        purchase_count = purchases.count()
        purchase_data = []
        for purchase in purchases:
            purchase_data.append({
                    "uid":purchase.uid,
                    "name": purchase.customer.name,
                    "date": purchase.date,
                    "total_amount": purchase.summary.final_amount,
                    "dueAmount": purchase.summary.due_amount,
                    "type":"purchaseRow"
                })

        return JsonResponse({"purchase_data": purchase_data,"purchase_count":purchase_count})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@login_required
@require_POST
def save_client(request):
    try:
        # Parse JSON data from request
        data = json.loads(request.body)

        # Extract client data
        name = data.get("name", "").strip()
        phone = data.get("phone", "").strip()
        email = data.get("email", "").strip()
        pan_id = data.get("pan_id", "").strip()
        address = data.get("address", "").strip()
        openingAmount = float(data.get("openingAmount"))
        customer_type = data.get("customer_type")
        customer_opening_type = data.get("customer_opening_type")
        user = request.user

        company = None
        company = user.owned_company or user.active_company

        if company:
            with transaction.atomic():
                client = Customer.objects.create(
                    company=company,
                    name=name,
                    phone=phone,
                    email=email,
                    pan_id=pan_id,
                    address=address,
                    customer_type = customer_type,
                )
                if customer_opening_type == "TORECEIVE":
                    remaining = RemainingAmount.objects.create(
                        customer = client,
                        orders = None,
                        remaining_amount = openingAmount,
                    )
                elif customer_opening_type == "TOGIVE":
                    remaining = RemainingAmount.objects.create(
                        customer = client,
                        orders = None,
                        remaining_amount = -openingAmount,
                    )
            return JsonResponse(
                {
                    "success": True,
                    "message": "Client saved successfully!",
                    "client": {
                        "uid": client.uid,
                        "id": client.id,
                        "name": client.name,
                        "phone": client.phone,
                        "email": client.email,
                        "pan_id": client.pan_id,
                        "address": client.address,
                    },
                    "remaining":remaining.remaining_amount

                }
            )

    except Exception as e:
        return JsonResponse({"success": False, "error": f"Server error: {str(e)}"})

@login_required
@require_POST
def save_customer(request):
    try:
        data = json.loads(request.body)
        name = data.get("clientName", "").strip()
        user = request.user
        company = user.owned_company or user.active_company
        if not company:
            return JsonResponse({"success": False, "error": "No active company found for user."})
        
        customer = Customer.objects.create(company=company,name=name)

        RemainingAmount.objects.create(customer=customer, remaining_amount=0)
        
        return JsonResponse({"success":True,"name":customer.name})
        
    except Exception as e:
        return JsonResponse({"success":False,"error":f"Server error:{str(e)}"})
   
@require_http_methods(["DELETE"])
def delete_client(request,id: UUID = None):
    try:
        client = get_object_or_404(Customer,id = id)
        client.delete()
        return JsonResponse({"success": True,"message":"Client deleted Successfully!!"})
    except Exception as e:
        print("Delete Client Error:", e)
        return JsonResponse({"success":False, "error":f"Server error: {str(e)}"})

@login_required
@require_POST
def update_client(request,id):
    try:
        data = json.loads(request.body)
        name = data.get("clientName")
        phone = data.get("clientPhone")
        address = data.get("clientAddress")
        pan_number = data.get("clientPan")
        email = data.get("clientEmail")
        customer_type = data.get("customer_type")
    except json.JSONDecodeError:
        return JsonResponse({"success": False, "error": "Invalid JSON"}, status=400)
    try:
        with transaction.atomic():
            customers = Customer.objects.get(id = id)
            customers.name = name
            customers.email = email
            customers.phone = phone
            customers.address = address
            customers.pan_id = pan_number
            customers.customer_type = customer_type
            customers.save()
        return JsonResponse({"success":True,"message": "Client updated successfully"})
    except Customer.DoesNotExist:
        return JsonResponse({"success": False, "error": "Client not found"}, status=404)
    except Exception as e:
        return JsonResponse({"success":False, "error":f"Server error: {str(e)}"})
    
# update opening balance
@login_required
@require_POST
@transaction.atomic
def update_opening_balance(request,id:UUID):
    try:
        print("hereere")
        data = json.loads(request.body)
        opening_balance = Decimal(str(data.get("openingAmount")))
        customer_opening_type = data.get("customer_opening_type")

        oldest_remaining = RemainingAmount.objects.filter(customer__uid = id).order_by('id').first()
     
        if customer_opening_type == "TORECEIVE":
            oldest_remaining.remaining_amount = opening_balance
        elif customer_opening_type == "TOGIVE":
            oldest_remaining.remaining_amount = -opening_balance
        oldest_remaining.save()
        
        return JsonResponse({"success":True})
    except Exception as e:
        return JsonResponse({"success":False,"error":f"Server error: {str(e)}"})

@login_required
@require_POST
def delete_invoice(request, id):
    if request.method == "POST":
        try:
            order_list = OrderList.objects.get(id=id)
            order_list.delete()
            return JsonResponse({"success": True})
        except OrderList.DoesNotExist:
            return JsonResponse({"success": False, "error": "Not found"})


@require_http_methods(["DELETE"])
def delete_product(request, id):
    product = get_object_or_404(Product, id=id)
    product.delete()
    return JsonResponse({"success": True})


@login_required
def invoice_layout(request, id):
    if request.method == "GET":
        try:
            order_list = OrderList.objects.get(uid=id)

            # Check if order_list exists
            if not order_list:
                return JsonResponse(
                    {
                        "success": False,
                        "error": "Order not found",
                        "message": f"No order found with ID: {id}",
                    },
                    status=404,
                )

            bill_info = Bill.objects.filter(order=order_list,purchase=None)
            ordersum_info = OrderSummary.objects.filter(order=order_list)
            additionalcharge_info = AdditionalCharges.objects.filter(
                additional_charges=order_list
            )
            note = order_list.notes

            # Get basic order information with null checks
            customer_name = order_list.customer.name if order_list.customer else "N/A"
            customer_address = (
                order_list.customer.address if order_list.customer else "N/A"
            )
            customer_Pan_id = (
                order_list.customer.pan_id
                if order_list.customer and order_list.customer.pan_id
                else "N/A"
            )
            invoice_date = order_list.order_date
            company_phone = order_list.company.phone if order_list.company else "N/A"
            customer_phone = order_list.customer.phone if order_list.customer else "N/A"
            company_name = order_list.company.name if order_list.company else "N/A"
            order_id = order_list.id
            uuid = order_list.uid

            # Initialize amounts
            total_amount = 0
            global_tax = 0
            global_discount = 0
            final_amount = 0
            received_amount = 0
            amount_due = 0

            # Get summary information
            if ordersum_info.exists():
                for data in ordersum_info:
                    total_amount = data.total_amount if data.total_amount else 0
                    global_tax = data.tax if data.tax else 0
                    global_discount = data.discount if data.discount else 0
                    received_amount = (
                        data.received_amount if data.received_amount else 0
                    )
                    amount_due = data.due_amount if data.due_amount else 0
                    final_amount = data.final_amount if data.final_amount else 0
                    break  # Assuming there's only one summary per order

            # Calculate derived amounts
            dis_amount = (
                (global_discount / 100) * total_amount if global_discount else 0
            )
            tax_amount = (
                (global_tax / 100) * (total_amount - dis_amount) if global_tax else 0
            )

            # Prepare items list
            items = []
            if bill_info.exists():
                for bill in bill_info:
                    # Check if product exists
                    if bill.product:
                        per_discount = (
                            (
                                Decimal((bill.quantity) * Decimal(bill.product_price))
                                * Decimal((bill.discount) / Decimal("100"))
                            ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                            if bill.discount
                            else 0
                        )
                        item = {
                            "id": bill.id,
                            "product_id": bill.product.id,
                            "product_name": bill.product.name
                            if bill.product.name
                            else "Unknown Product",
                            "quantity": bill.quantity if bill.quantity else 0,
                            "rate": float(bill.product_price)
                            if bill.product_price
                            else 0,
                            "discount": bill.discount if bill.discount else 0,
                            "product_price": float(bill.product_price)
                            if bill.product_price
                            else 0,
                            "perDiscount": per_discount,
                            "line_total": (
                                Decimal(bill.product_price) * Decimal(bill.quantity)
                            )
                            - per_discount
                            if bill.product_price and bill.quantity
                            else 0,
                            "discount_percent": 0,
                            "discount_amount": 0,
                        }
                    else:
                        item = {
                            "id": bill.id,
                            "product_id": None,
                            "product_name": "Product not found",
                            "quantity": bill.quantity if bill.quantity else 0,
                            "rate": 0,
                            "product_price": 0,
                            "line_total": 0,
                            "discount_percent": 0,
                            "discount_amount": 0,
                        }
                    items.append(item)

            # Prepare additional charges
            additional_charges = []
            if additionalcharge_info.exists():
                for charge in additionalcharge_info:
                    charge_data = {
                        "charge_name": charge.charge_name
                        if charge.charge_name
                        else "Additional Charge",
                        "charge_amount": float(charge.additional_amount)
                        if charge.additional_amount
                        else 0,
                        "charge_type": getattr(charge, "charge_type", "additional"),
                    }
                    additional_charges.append(charge_data)

            # Build response data
            response_data = {
                "success": True,
                "invoice": {
                    "id": order_id,
                    "uuid": uuid,
                    "invoice_number": f"INV-{order_id:03d}",
                    "company_name": company_name,
                    "company_phone": company_phone,
                    "company_address": "Gokarneshwor-4, Kathmandu",
                    "customer": {
                        "name": customer_name,
                        "address": customer_address,
                        "phone": customer_phone,
                        "pan_id": customer_Pan_id,
                    },
                    "dates": {
                        "invoice_date": invoice_date.strftime("%Y-%m-%d")
                        if invoice_date
                        else None,
                        "invoice_date_formatted": invoice_date.strftime("%Y %b %d")
                        if invoice_date
                        else "N/A",
                    },
                    "amounts": {
                        "subtotal": float(total_amount),
                        "total_amount": float(total_amount),
                        "global_tax_percent": float(global_tax),
                        "global_tax_amount": float(tax_amount),
                        "global_discount_percent": float(global_discount),
                        "global_discount_amount": float(dis_amount),
                        "final_amount": float(final_amount),
                        "received_amount": float(received_amount),
                        "amount_due": float(amount_due),
                        "balance": float(amount_due),
                    },
                    "payment_info": {
                        "payment_mode": "Cash",
                        "status": "Paid" if amount_due == 0 else "Pending",
                    },
                    "items": items,
                    "additional_charges": additional_charges,
                    "remarks": note,
                },
            }

            return JsonResponse(response_data, safe=False)

        except OrderList.DoesNotExist:
            return JsonResponse(
                {
                    "success": False,
                    "error": "Invoice not found",
                    "message": f"No invoice found with ID: {id}",
                },
                status=404,
            )

        except Exception as e:
            # Log the full error for debugging
            import traceback

            error_details = traceback.format_exc()
            print(f"Error in invoice_layout: {e}")
            print(f"Traceback: {error_details}")

            return JsonResponse(
                {
                    "success": False,
                    "error": "Server error",
                    "message": str(e),
                    "details": "Check if all related objects (customer, company, product) exist in database",
                },
                status=500,
            )

    return JsonResponse(
        {
            "success": False,
            "error": "Method not allowed",
            "message": "Only GET method is allowed",
        },
        status=405,
    )


def invoices(request, id=None):
    context = get_serialized_data(request.user, "invoices")
    if id:
        return render(request, "website/create_invoice.html", context)
    return render(request, "website/bill.html", context)


def clients(request):
    context = get_serialized_data(request.user, "clients")
    return render(request, "website/bill.html", context)


def reports(request):
    context = get_serialized_data(request.user, "reports")
    return render(request, "website/bill.html", context)

def expenses(request):
    context = get_serialized_data(request.user, "expenses")
    return render(request,"website/bill.html",context)

def purchase(request,id:UUID = None):
    context = get_serialized_data(request.user, "purchase")
    if id:
        return render(request, "website/create_invoice.html", context)
    return render(request,"website/bill.html",context)
    
def products(request):
    context = get_serialized_data(request.user, "products")
    # context["product_number"] = context["product_count"]
    return render(request, "website/bill.html", context)


def settings(request):
    context = get_serialized_data(request.user, "settings")
    return render(request, "website/bill.html", context)


def client_detail(request,id: UUID):
    context = get_serialized_data(request.user, "dashboard")
    if id:
        customer = get_object_or_404(Customer,uid=id)
        remaining = RemainingAmount.objects.filter(customer__uid = id).order_by('-id').first()
        context["customer_info"] = customer
        context["customer_balance"] = remaining
    return render(request, "website/client_detail.html", context)

@login_required
def fetch_transactions(request,id:UUID = None):
    user = request.user
    company = user.owned_company or user.active_company

    if not company:
        return JsonResponse({"transactions": []})
    if id:
        transactions = OrderList.objects.filter(customer__uid = id).order_by('-id')
        payment_in_transactions = PaymentIn.objects.filter(customer__uid =id)
        payment_out_transactions = PaymentOut.objects.filter(customer__uid = id)
        client = Customer.objects.get(uid = id)
        purchases = Purchase.objects.filter(customer__uid = id)
        invoiceData = []
        for transaction in transactions:
            summary = getattr(transaction,"summary",None)
            remaining = transaction.remaining.remaining_amount if hasattr(transaction, "remaining") else 0
            invoiceData.append({
                "uid":transaction.uid,
                "id": transaction.id,
                "date": transaction.order_date,
                "finalAmount":summary.final_amount if summary else 0,
                "remarks": transaction.notes,
                "remainingAmount": remaining if remaining else 0,
                "type": "sale"

            })
        paymentInData=[]
        for paymentIn in payment_in_transactions:
            remainingAmount = paymentIn.remainings.remaining_amount 
            paymentInData.append({
                "id":paymentIn.id,
                "date":paymentIn.date,
                "payment_in":paymentIn.payment_in,
                "remainingAmount": remainingAmount,
                "remarks":paymentIn.remarks,
                "type": "payment"
            })
        
        paymentOutData = []
        for paymentOut in payment_out_transactions:
            paymentOutData.append({
                "id":paymentOut.id,
                "date":paymentOut.date,
                "payment_out":paymentOut.payment_out,
                "remainingAmount": paymentOut.remainings.remaining_amount,
                "remarks":paymentOut.remarks,
                "type": "paymentOut"

            })
        
        clientData =[]
        remaining = RemainingAmount.objects.filter(customer__uid = id).order_by('id').first()
        clientData.append({
            "date":client.date,
            "balance":remaining.remaining_amount,
            "type": "Opening"
        })

        addAdjustmentBalance = []
        balance_adjustments = BalanceAdjustment.objects.filter(customer__uid = id)
        for balance_adjust in balance_adjustments:
            addAdjustmentBalance.append({
                "id":balance_adjust.id,
                "date":balance_adjust.date,
                "amount":abs(balance_adjust.amount),
                "balance":balance_adjust.remainings.remaining_amount,
                "remarks":balance_adjust.remarks,
                "type":"add" if balance_adjust.amount > 0 else "reduce" 
            })

        purchase_data = []
        for purchase in purchases:
            purchase_data.append({
                "uid":purchase.uid,
                "id":purchase.id,
                "date":purchase.date,
                "total_amount":purchase.summary.final_amount,
                "remaining":purchase.remaining.remaining_amount,
                "type":"purchaseRow",
            })

        mergedData = invoiceData + paymentInData + paymentOutData + clientData + addAdjustmentBalance + purchase_data
        mergedData.sort(key=lambda x: x["date"], reverse=True)
    
    else:
        transactions = OrderList.objects.filter(company=company)
        payment_in_transactions = PaymentIn.objects.filter(company=company)
        payment_out_transactions = PaymentOut.objects.filter(company=company)
        purchases = Purchase.objects.filter(company=company)

        invoiceData = []
        for transaction in transactions:
            summary = getattr(transaction,"summary",None)
            invoiceData.append({
                "id": transaction.id,
                "date": transaction.order_date,
                "name":transaction.customer.name,
                "finalAmount":summary.final_amount if summary else 0,
                "receivedAmount":summary.received_amount if summary else 0,
                "dueAmount": summary.due_amount,
                "type": "sale"

            })
        paymentInData=[]
        for paymentIn in payment_in_transactions:
            paymentInData.append({
                "id":paymentIn.id,
                "date":paymentIn.date,
                "payment_in":paymentIn.payment_in,
                "name":paymentIn.customer.name,
                "type": "paymentIn"
            })
        
        paymentOutData = []
        for paymentOut in payment_out_transactions:
            paymentOutData.append({
                "id":paymentOut.id,
                "date":paymentOut.date,
                "payment_out":paymentOut.payment_out,
                "name":paymentOut.customer.name,
                "type": "paymentOut"

            })

        purchaseData = []
        for purchase in purchases:
            purchaseData.append({
                "id":purchase.id,
                "date":purchase.date,
                "name":purchase.customer.name,
                "total_amount":purchase.summary.final_amount,
                "receivedAmount":purchase.summary.received_amount,
                "dueAmount":purchase.summary.due_amount,
                "type":"purchase"
            })
        mergedData = invoiceData + paymentInData + paymentOutData+purchaseData
        mergedData.sort(key=lambda x: x["date"], reverse=True)

    return JsonResponse({"success":True,
                         "transactions":mergedData})

@login_required
@require_POST
@transaction.atomic
def payment_in(request,id):
    try:
        user=request.user
        company = user.owned_company or user.active_company
        data = json.loads(request.body)
        payment_in = Decimal(str(data.get("payment_in")))
        payment_in_date = data.get("payment_in_date")
        payment_in_remark = data.get("payment_in_remark")

      
        remainingAmount = RemainingAmount.objects.filter(customer_id=id).order_by('-id').first()
        
        latest_remaining = remainingAmount.remaining_amount if remainingAmount else Decimal("0.0")
        current_remaining = latest_remaining - payment_in

        new_remaining = RemainingAmount.objects.create(customer_id=id,
                orders=None,
                remaining_amount=current_remaining)
            
        paymentIn = PaymentIn.objects.create(company=company,customer_id=id,
                                            date=payment_in_date,
                                            remainings=new_remaining,
                                            payment_in=payment_in,
                                            remarks=payment_in_remark)
        

        return JsonResponse({"success":True,"uid":paymentIn.customer.uid})
    
    except Exception as e:
        return JsonResponse(
            {"success": False, "error": f"Server error: {str(e)}"}, status=500
        )

# to fill the update payment in modal form
@login_required
def fill_update_payment_modal(request,id):
    user = request.user
    company = user.owned_company or user.active_company

    if not company:
        return JsonResponse({"transactions": []})
    
    payment_in_data = get_object_or_404(
        PaymentIn,
        id=id,
    )
    fill_up_data = {
        "id":payment_in_data.id,
        "name":payment_in_data.customer.name,
        "date":payment_in_data.date,
        "amount":payment_in_data.payment_in,
        "remarks":payment_in_data.remarks
    }
    return JsonResponse({"fill_up_data":fill_up_data})

# to fill the update payment out modal form
@login_required
def fill_update_payment_out_modal(request,id):
    user = request.user
    company = user.owned_company or user.active_company

    if not company:
        return JsonResponse({"transactions": []})
    
    payment_out_data = get_object_or_404(
        PaymentOut,
        id=id,
    )
    fill_up_data = {
        "id":payment_out_data.id,
        "name":payment_out_data.customer.name,
        "date":payment_out_data.date,
        "amount":payment_out_data.payment_out,
        "remarks":payment_out_data.remarks
    }
    return JsonResponse({"fill_up_data":fill_up_data})


@login_required
@require_POST
@transaction.atomic
def update_payment_in(request,id):
    try:
        data = json.loads(request.body)
        latest_payment_in = data.get("paymentInAmount")
        update_remarks = data.get("updatePaymentRemarks")

        previous_payment_in = PaymentIn.objects.get(id = id)
        previous_amount = previous_payment_in.payment_in
        previous_remaining = previous_payment_in.remainings.remaining_amount

        amount_to_calculate_on = Decimal(str(previous_remaining)) + Decimal(str(previous_amount))
       
        # after updating the amount
        latest_remaining  = Decimal(str(amount_to_calculate_on)) - Decimal(str(latest_payment_in)) 
        
        
        # latest remaining amount now
        previous_payment_in.remainings.remaining_amount= latest_remaining

        # new incoming payment in amount and remarks
        previous_payment_in.payment_in = latest_payment_in
        previous_payment_in.remarks = update_remarks

        previous_payment_in.remainings.save()
        previous_payment_in.save()
        return JsonResponse({"success":True})
    except Exception as e:
        return JsonResponse({"success":False,"error": f"Server error: {str(e)}"}, status=500)
    
@login_required
@require_POST
@transaction.atomic
def update_payment_out(request,id):
    try:
        data = json.loads(request.body)
        payment_out_amount = data.get("paymentOutAmount")
        update_remarks = data.get("updatePaymentRemarks")

        paymentOut = PaymentOut.objects.get(id=id)

        previous_remaining = paymentOut.remainings.remaining_amount
        previous_payment_amount = paymentOut.payment_out

        amount_to_calculate_on = Decimal(str(previous_remaining)) - Decimal(str(previous_payment_amount))

        latest_remaining = Decimal(str(payment_out_amount)) + Decimal(str(amount_to_calculate_on))

        paymentOut.remainings.remaining_amount = latest_remaining
        paymentOut.payment_out = payment_out_amount
        paymentOut.remarks = update_remarks

    
        paymentOut.remainings.save()
        paymentOut.save()

        return JsonResponse({"success":True})

    except Exception as e:
        return JsonResponse({"success":False,"error": f"Server error: {str(e)}"}, status=500)

@login_required
@require_POST
@transaction.atomic
def payment_out(request,id):
    try:
        user=request.user
        company = user.owned_company or user.active_company
        data = json.loads(request.body)
        payment_out = Decimal(str(data.get("payment_out")))
        payment_out_date = data.get("payment_out_date")
        payment_out_remark = data.get("payment_out_remark")

        remainingAmount = RemainingAmount.objects.filter(customer_id=id).order_by('-id').first()
       
        last_remaining = remainingAmount.remaining_amount if remainingAmount else Decimal("0.0")
        current_remaining = last_remaining + payment_out

        new_remaining = RemainingAmount.objects.create(
            customer_id=id,
            orders=None,
            remaining_amount=current_remaining
        )

        paymentOut = PaymentOut.objects.create(company=company,customer_id=id,date=payment_out_date,remainings=new_remaining,payment_out=payment_out,remarks=payment_out_remark)
        paymentOut.save()

        return JsonResponse({"success":True,"uid":paymentOut.customer.uid})
    except Exception as e:
        return JsonResponse(
            {"success": False, "error": f"Server error: {str(e)}"}, status=500
        )
    

@login_required
@require_POST
@transaction.atomic
def balance_adjustment(request, id):
    try:
        data = json.loads(request.body)
        toAddAmount = Decimal(data.get("toAddAmount") or "0")
        toReduceAmount = Decimal(data.get("toReduceAmount") or "0")
        remarks = data.get("adjustment_remark", "")

        remaining = (
            RemainingAmount.objects
            .filter(customer_id=id)
            .order_by('-id')
            .first()
        )
        customer = Customer.objects.get(id=id)
        last_remaining = remaining.remaining_amount if remaining else Decimal("0.00")
        if toAddAmount > 0 and toReduceAmount == 0:
            amount = toAddAmount
        elif toReduceAmount > 0 and toAddAmount == 0:
            amount = -toReduceAmount
        else:
            return JsonResponse(
                {"success": False, "error": "Invalid adjustment"},
                status=400
            )

        new_balance = last_remaining + amount

        new_remaining = RemainingAmount.objects.create(
            customer_id=id,
            orders=None,
            remaining_amount=new_balance
        )

        BalanceAdjustment.objects.create(
            customer_id=id,
            remainings=new_remaining,
            amount=amount,
            remarks=remarks
        )

        return JsonResponse({"success": True,"uid":customer.uid})

    except Exception as e:
        return JsonResponse(
            {"success": False, "error": str(e)},
            status=500
        )

@login_required
@require_POST
@transaction.atomic
def update_add_adjust(request,id):
    try:
        data = json.loads(request.body)
        adjust_amount = data.get("toAdjustAmount")
        adjustment_remark = data.get('adjustment_remark')

        if adjust_amount <= 0:
            raise ValueError("Adjustment amount must be positive")
        
        
        balance_adjust = get_object_or_404(BalanceAdjustment,id =id)

        current_remaining_amount = balance_adjust.remainings.remaining_amount
        current_adjust_amount = balance_adjust.amount

        amount_to_calculate_on = Decimal(str(current_remaining_amount)) - Decimal(str(current_adjust_amount))
        latest_remaining = Decimal(str(amount_to_calculate_on)) + Decimal(str(adjust_amount))

        balance_adjust.remainings.remaining_amount = latest_remaining
        balance_adjust.remainings.save()

        balance_adjust.amount = adjust_amount
        balance_adjust.remarks = adjustment_remark
        balance_adjust.save()

        return JsonResponse({"success":True,"message": "Product saved successfully!","uid":balance_adjust.customer.uid})
    except Exception as e:
        return JsonResponse({"success":False, "error": str(e)},status=500)
    

@login_required
@require_POST
@transaction.atomic
def update_reduce_adjust(request,id):
    try:
        data = json.loads(request.body)
        adjust_amount = Decimal(data.get("toAdjustAmount"))
        adjustment_remark = data.get('adjustment_remark')

        if adjust_amount <= 0:
            raise ValueError("Adjustment amount must be positive")

        with transaction.atomic():
            balance_adjust = get_object_or_404(BalanceAdjustment,id =id)
            current_remaining_amount = balance_adjust.remainings.remaining_amount

            current_adjust_amount = abs(balance_adjust.amount)

            amount_to_calculate_on = Decimal(str(current_remaining_amount)) + Decimal(str(current_adjust_amount))
            latest_remaining = Decimal(str(amount_to_calculate_on)) - Decimal(str(adjust_amount))

            balance_adjust.remainings.remaining_amount = latest_remaining
            balance_adjust.remainings.save()

            balance_adjust.amount = -adjust_amount
            balance_adjust.remarks = adjustment_remark
            balance_adjust.save()

        return JsonResponse({"success":True,"message": "Product saved successfully!","uid":balance_adjust.customer.uid})
    except Exception as e:
        return JsonResponse({"success":False, "error": str(e)},status=500)

@login_required
def fill_up_add_adjust(request,id):
    user = request.user
    company = user.owned_company or user.active_company

    if not company:
        return JsonResponse({"fill_up": []})
    
    adjust_balance = get_object_or_404(BalanceAdjustment,id=id)
    customerId = adjust_balance.customer.id
    latest_remaining = RemainingAmount.objects.filter(customer__id = customerId).order_by('-id').first()
    
    fill_up={
            "amount":adjust_balance.amount,
            "date":adjust_balance.date,
            "remark":adjust_balance.remarks if adjust_balance.remarks else '',
    }
    return JsonResponse({"fill_up":fill_up,"remainingAmount":latest_remaining.remaining_amount,})


def product_detail(request, id: UUID = None):
    context = get_serialized_data(request.user, "dashboard")
    if id:
        product = get_object_or_404(Product, uid=id)
        item_activity = get_list_or_404(ItemActivity, product=product)

        context["product_detail"] = product
        context["item_activity"] = item_activity
    return render(request, "website/product_detail.html", context)

@login_required
def fetch_product_activities(request, id: UUID):
    user = request.user
    company = user.owned_company or user.active_company

    if not company:
        return JsonResponse({"activities": []})
    item_activities = ItemActivity.objects.filter(product__uid=id).order_by("-id")
    data = []
    for act in item_activities:
        data.append(
            {
                "id": act.id,
                "product_selling_price": act.product.selling_price,
                "product_cost_price": act.product.cost_price,
                "type": act.type,
                "date": act.date.isoformat(),
                "change": act.change,
                "quantity": act.quantity,
                "remarks": act.remarks if act.remarks else "---",
                "order_uid": act.order.uid if act.order else None,
                "purchase_id": act.purchase.id if act.purchase else None,
            }
        )
    return JsonResponse({"success": True, "activities": data})


@login_required
@require_POST
@transaction.atomic
def update_stock(request, id):
    try:
        data = json.loads(request.body)

        activity_id = data.get("id")
        stock_quantity = float(data.get("stockQuantity"))
        product_price = data.get("productPrices")
        stock_date = data.get("stockDate")
        stock_remarks = data.get("stockRemarks")
        type = str(data.get("type"))
        remark = str(data.get("remarks"))
    
        item_activity = ItemActivity.objects.get(id=activity_id)
        product = item_activity.product

        if type == "Reduce Stock":
            old_reduction = abs(float(item_activity.change))
           
            restored_stock = product.product_quantity + old_reduction
            
            new_quantity = restored_stock - stock_quantity

            item_activity.change = -stock_quantity

        elif type == "Add Stock" and remark == "Opening Stock":
            item_activity.change = f"+{stock_quantity}"
            new_quantity = stock_quantity

        elif type == "Add Stock":
            old_addition = abs(float(item_activity.change))
            restored_stock = product.product_quantity - old_addition
            new_quantity = restored_stock + stock_quantity

            item_activity.change = f"+{stock_quantity}"

        else:
            return JsonResponse(
                {"success": False, "error": "Invalid stock type"}, status=400
            )

        product.product_quantity = new_quantity
        product.save()
        item_activity.date = stock_date
        item_activity.remarks = stock_remarks
        item_activity.quantity = new_quantity
        item_activity.save()

        return JsonResponse(
            {
                "success": True,
                "message": "Stock updated successfully",
                "updatedActivity": {
                    "id": item_activity.id,
                    "type": item_activity.type,
                    "date": item_activity.date,
                    "stock_quantity": item_activity.change,
                    "quantity": item_activity.quantity,
                    "remarks": item_activity.remarks,
                    "order_id": item_activity.order.id if item_activity.order else None,
                },
            }
        )

    except Exception as e:
        print("Update product error:", e)
        return JsonResponse(
            {"success": False, "error": f"Server error: {str(e)}"}, status=500
        )


@login_required
def create_invoice_page(request):
    """Full page view for creating invoice"""
    try:
        # Get serialized data for the invoice creation page
        context = get_serialized_data(request.user, "dashboard")
        context['mode'] = 'invoice'
        return render(request, "website/create_invoice.html", context)
    except Exception:
        return render(
            request,
            "website/create_invoice.html",
            {
                "product": "[]",
                "customer": "[]",
                "product_cat": "[]",
                "invoices": "[]",
                "active_tab": "invoices",
            },
        )
@login_required
def create_purchases(request):
    context = get_serialized_data(request.user, "purchase")
    context['mode'] = 'purchase'
    return render(request,"website/create_invoice.html",context)

@login_required 
def customer_totals(request):
    user = request.user 
    company = user.owned_company or user.active_company
    if not company:
        return JsonResponse({"customers": []})
    customers = company.customers.all() 

    toReceive = 0
    toGive = 0 
    for customer in customers:
        remainingAmount = RemainingAmount.objects.filter(customer = customer).order_by('-id').first()
        if remainingAmount.remaining_amount > 0:
            toReceive+=remainingAmount.remaining_amount
        elif remainingAmount.remaining_amount < 0:
            toGive+=abs(remainingAmount.remaining_amount)
   
    amount={
        "toReceive":toReceive,
        "toGive":toGive
    }

    totalSales = OrderList.objects.filter(company=company)
    totalAmount = Decimal("0")
    for totalSale in totalSales:
        totalAmount += Decimal(str(totalSale.summary.final_amount))

    expenses = Expense.objects.filter(company=company)
    expenses_total = Decimal("0")
    for expense in expenses:
        expenses_total +=Decimal(str(expense.total_amount))

    totalPurchase = Purchase.objects.filter(company=company)
    totalPurchaseAmount = Decimal("0")
    print('total kati tw',totalPurchaseAmount)
    for purchase in totalPurchase:
        totalPurchaseAmount += Decimal(str(purchase.summary.final_amount))
    print('total kati tw',totalPurchaseAmount)


    return JsonResponse({"amount":amount,"totalSale":totalAmount,"expense_total":expenses_total,"purchase_total":totalPurchaseAmount})

@login_required       
def expense_category(request):
    user = request.user
    company = user.owned_company or user.active_company

    if not company:
        # Just return default categories if no company
        default_cats = ExpenseCategory.objects.filter(name__in=DEFAULT_CATEGORIES)
        expense_categories = [{"name": cat.name} for cat in default_cats]
        return JsonResponse({"expense_categories": expense_categories})

    # Categories linked to the company
    company_cats = ExpenseCategory.objects.filter(companies=company)
    # Also default categories included
    default_cats = ExpenseCategory.objects.filter(name__in=DEFAULT_CATEGORIES)

    all_cats = (company_cats | default_cats).distinct()

    expense_categories = [{"name": cat.name} for cat in all_cats]

    return JsonResponse({"expense_categories": expense_categories})

@login_required
@require_POST
@transaction.atomic
def save_expenses(request):
    try:
        data = json.loads(request.body)
        amount = float(data.get("totalAmount"))
        expenseNumber = float(data.get("expenseNumber"))
        remarks = data.get("expenseRemarks")
        category = data.get("expenseCategory")


        user = request.user
        company = user.owned_company or user.active_company
    
        category = ExpenseCategory.objects.filter(name=category).first()
        if not category:
            return JsonResponse({"success": False, "error": "Category not found"}, status=400)
        
        Expense.objects.create(company = company,expense_number = expenseNumber,category=category,total_amount=amount,remarks=remarks)

        return JsonResponse({"success":True})
    except Exception as e:
        print("Save Expenses Error:", e)
        return JsonResponse({"success": False, "error": f"Server error: {str(e)}"}, status=500)

@login_required
@require_POST
@transaction.atomic
def update_expense(request,id):
    try:
        data = json.loads(request.body)
        category = data.get("expenses_category")
        amount = Decimal(str(data.get("expenses_total")))
        remarks = data.get("expenses_remarks")

        expense = Expense.objects.get(id = id)

        expense_category_obj = ExpenseCategory.objects.get(name = category,companies=expense.company)
        expense.category = expense_category_obj
        expense.total_amount = amount
        expense.remarks = remarks
        expense.save()
        return JsonResponse({"success":True,"message":"Expense updated successfully"})

    except Exception as e:
        return JsonResponse({"success": False, "error": f"Server error: {str(e)}"}, status=500)

@require_http_methods(["DELETE"])
def delete_expense(request,id):
    try:
        expense = get_object_or_404(Expense,id = id)
        expense.delete()
        return JsonResponse({"success": True,"message":"Expense deleted Successfully!!"})
    except Exception as e:
        print("Delete Expense Error:", e)
        return JsonResponse({"success":False, "error":f"Server error: {str(e)}"})

@login_required
def expense_info(request,id = None):
    try:
        user = request.user
        company = user.owned_company or user.active_company
        if not company:
            return JsonResponse({"expense_data": [], "expense_count": 0})
        if id is not None:
            expenses = Expense.objects.get(id=id)
            expense_data = {
                    "expense_number":expenses.expense_number,
                    "category": expenses.category.name if expenses.category else None,
                    "date": expenses.date,
                    "amount": expenses.total_amount,
                    "remarks": expenses.remarks,
                }
            return JsonResponse({"expense_data": expense_data})
        else:
            expenses = Expense.objects.filter(company=company).order_by('-date')
            expense_count = expenses.count()

            expense_data = []
            for expense in expenses:
                expense_data.append({
                    "id":expense.id,
                    "category": expense.category.name if expense.category else None,
                    "date": expense.date,
                    "amount": expense.total_amount,
                    "remarks": expense.remarks,
                })

        return JsonResponse({"expense_data": expense_data, "expense_count": expense_count})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@login_required
@require_POST
@transaction.atomic
def save_category(request):
    try:
        data = json.loads(request.body)
        category_name = data.get("expenseCategory", "").strip()

        if not category_name:
            return JsonResponse({"success": False, "error": "Category name required"}, status=400)

        user = request.user
        company = user.owned_company or user.active_company

        if not company:
            return JsonResponse({"success": False, "error": "No active company"}, status=400)

        # Prevent duplicates + reuse existing category
        expense_category, created = ExpenseCategory.objects.get_or_create(
            name=category_name
        )

        # this link the company to the category
        expense_category.companies.add(company)

        return JsonResponse({
            "success": True,
            "category": expense_category.name,
            "created": created
        })

    except Exception as e:
        return JsonResponse({
            "success": False,
            "error": f"Server error: {str(e)}"
        }, status=500)

