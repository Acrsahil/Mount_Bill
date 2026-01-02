import json
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.db import transaction
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
)

def filtered_products(request):
    user = request.user
    company = user.owned_company or user.active_company

    if not company:
        return JsonResponse({"products": []})
    
    products = Product.objects.all()
    category_id = request.GET.get('category')
    stock_status = request.GET.get('stock')

    if category_id:
        products = products.filter(category__id=category_id)

    if stock_status == 'instock':
        products = products.filter(product_quantity__gt=0)
    elif stock_status == 'outstock':
        products = products.filter(product_quantity__lte=0)

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



def category_json(request):
    user = request.user
    company = user.owned_company or user.active_company

    if not company:
        return JsonResponse({"categories": []})
    categories = ProductCategory.objects.filter(company=company)
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

    products = Product.objects.filter(company=company).select_related("category")

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
            "id": c.id,
            "name": c.name,
            "phone": c.phone,
            "email": c.email,
            "address": c.address,
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
        user = request.user

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
        )

        item_activity = ItemActivity(
            product=product, change=quantity, quantity=quantity, remarks="Opening Stock"
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
        item_activity=[
             {
                    "date": item_activity.date.isoformat(),
                    "change": item_activity.change,
                    "quantity": item_activity.quantity,
                    "remarks": item_activity.remarks,
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
               "itemactivity":item_activity,
            }
        )

    except Exception as e:
        print(f"Server error in save_product: {str(e)}")
        return JsonResponse(
            {"success": False, "error": f"Server error: {str(e)}"}, status=500
        )


@login_required
@csrf_exempt
@require_POST
def update_product(request, id):
    try:
        data = json.loads(request.body)

        product_id = data.get("id")
        print(product_id)
        name = data.get("name", "").strip()
        category_name = data.get("category", "").strip()
        cost_price = data.get("cost_price")
        selling_price = data.get("selling_price")
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
@csrf_exempt
@require_POST
def add_stock(request, id):
    try:
        data = json.loads(request.body)
        product_id = data.get("id")
        stock = int(data.get("stock_to_add"))
        product = Product.objects.get(id=product_id)
        product.product_quantity += stock
        product.save()

        return JsonResponse(
            {
                "success": True,
                "message": "Stock updated successfully",
                "product": {"id": product.id, "quantity": product.product_quantity},
            }
        )
    except Exception as e:
        print("Update product error:", e)
        return JsonResponse(
            {"success": False, "error": f"Server error: {str(e)}"}, status=500
        )


@login_required
@csrf_exempt
@require_POST
def reduce_stock(request, id):
    try:
        data = json.loads(request.body)
        product_id = data.get("id")
        stock = int(data.get("stock_to_remove"))
        product = Product.objects.get(id=product_id)
        product.product_quantity -= stock
        product.save()

        return JsonResponse(
            {
                "success": True,
                "message": "Stock updated successfully",
                "product": {
                    "id": product.id,
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
@csrf_exempt
@require_POST
@transaction.atomic
def save_invoice(request):
    """Save complete invoice via AJAX - REMOVED REDUNDANT CODE"""
    try:
        data = json.loads(request.body)
        print("data-0----------------------------", data)
        client_name = data.get("clientName", "").strip()
        invoice_date_str = data.get("invoiceDate", "")
        invoice_items = data.get("items", [])
        global_discount = float(data.get("globalDiscountPercent", 0))

        print("yo cheai global_discount ho hai->>>>>>>>>>>>>>>>...", global_discount)
        global_tax = float(data.get("globalTaxPercent", 0))
        additional_charges = float(data.get("additionalCharges", 0))
        charge_name_amount = data.get("additionalchargeName", [])
        notes_here = data.get("noteshere", "").strip()
        received_amount = float(data.get("receivedAmount"))

        print(f"uta bata pathaune recieved amount haii tw {received_amount}")
        print(notes_here)
        # total_amount = float(data.get("totalAmount"))
        user = request.user

        # print(f"total amount ko value:{total_amount}")
        company = None
        company = user.owned_company or user.active_company

        if not company:
            print("hello")
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
                invoice_date = datetime.strptime(invoice_date_str, "%Y-%m-%d").date()
                invoice_date = timezone.make_aware(
                    datetime.combine(invoice_date, datetime.min.time())
                )
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
                product=product,
                quantity=quantity,
                product_price=Decimal(
                    str(price)
                ),  # Convert to Decimal    quantity=quantity,
                bill_date=timezone.now(),
            )

            total_amount += (quantity * price) - (
                (quantity * price) * (discountPercent / 100)
            )

            print("this is negatiove qty->>> ", -quantity)

            new_qty = product.product_quantity - quantity
            ItemActivity.objects.create(
                order=order,
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

        final_amount += global_discount / 100 * final_amount
        final_amount += additional_charges

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

        remaining_amount = 0
        remaining_amount = Decimal(str(final_amount)) - Decimal(str(received_amount))

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
            due_amount=remaining_amount,
        )

        try:
            order_summary.full_clean()  # validate against max_digits, etc.
            order_summary.save()
        except ValidationError as e:
            print("Validation errors:", e.message_dict)
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

        remaining, created = RemainingAmount.objects.get_or_create(
            customer=customer, defaults={"remaining_amount": remaining_amount}
        )
        if not created:
            remaining.remaining_amount += remaining_amount
            remaining.save()

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


def sahilpage(request):
    products = Product.objects.select_related("category").all()
    return render(request, "billingsystem/index.html", {"products": products})


def product_details(request, pro_id, second_id):
    pro = get_object_or_404(Product, pk=pro_id)
    ans = pro_id + second_id
    return render(
        request,
        "billingsystem/productprice.html",
        {"pro": pro, "ans": ans},
    )


@require_POST
@csrf_exempt
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
        user = request.user

        company = None
        company = user.owned_company or user.active_company

        if company:
            client = Customer.objects.create(
                company=company,
                name=name,
                phone=phone,
                email=email,
                pan_id=pan_id,
                address=address,
            )
            return JsonResponse(
                {
                    "success": True,
                    "message": "Client saved successfully!",
                    "client": {
                        "id": client.id,
                        "name": client.name,
                        "phone": client.phone,
                        "email": client.email,
                        "pan_id": client.pan_id,
                        "address": client.address,
                    },
                }
            )

    except Exception as e:
        return JsonResponse({"success": False, "error": f"Server error: {str(e)}"})


@login_required
@csrf_exempt
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
    print("this is id-> ", id)
    product = get_object_or_404(Product, id=id)
    product.delete()
    return JsonResponse({"success": True})


# @login_required
# @csrf_exempt
def invoice_layout(request, id):
    if request.method == "GET":
        try:
            order_list = OrderList.objects.get(id=id)

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

            bill_info = Bill.objects.filter(order=order_list)
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
                            "product_price": float(bill.product_price)
                            if bill.product_price
                            else 0,
                            "line_total": float(bill.product_price * bill.quantity)
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
                    "order_id": order_id,
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


def products(request):
    context = get_serialized_data(request.user, "products")
    # context["product_number"] = context["product_count"]
    return render(request, "website/bill.html", context)


def settings(request):
    context = get_serialized_data(request.user, "settings")
    return render(request, "website/bill.html", context)


def product_detail(request, id: UUID = None):
    context = get_serialized_data(request.user, "dashboard")
    if id:
        product = get_object_or_404(Product, uid=id)
        item_activity = get_list_or_404(ItemActivity, product=product)

        context["product_detail"] = product
        context["item_activity"] = item_activity

        for act in item_activity:
            print("this is act.product_name ", act.product.name)
            print("this is act.change ", act.change)
            print("this is act.quantity ", act.quantity)
            print("this is act.remarks ", act.remarks)

            if not act.order:
                print("this is act.remarks ", "Reduce Stock")
            else:
                print("this is act.remarks ", f"Sales Invoice #{act.order.id}")

    return render(request, "website/product_detail.html", context)

def fetch_product_activities(request,id : UUID):
    user = request.user
    company = user.owned_company or user.active_company

    if not company:
        return JsonResponse({"activities": []})
    item_activities = ItemActivity.objects.filter(product__uid = id)
    data = []
    for act in item_activities:
        data.append({
                    "date": act.date.isoformat(),
                    "change": act.change,
                    "quantity": act.quantity,
                    "remarks": act.remarks,
                }

        )
    return JsonResponse({"success":True,
                         "activities":data})

@login_required
def create_invoice_page(request):
    """Full page view for creating invoice"""
    try:
        # Get serialized data for the invoice creation page
        context = get_serialized_data(request.user, "dashboard")
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
