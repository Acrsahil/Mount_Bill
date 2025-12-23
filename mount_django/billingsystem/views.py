import json
from datetime import datetime
from decimal import Decimal

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .models import (
    AdditionalCharges,
    Bill,
    Customer,
    OrderList,
    OrderSummary,
    Product,
    ProductCategory,
    RemainingAmount,
)


def get_serialized_data(user, active_tab="dashboard"):
    """Helper function to get serialized data for template"""
    company = None
    if user.owned_company:
        company = user.owned_company
    if user.active_company:
        company = user.active_company
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
@csrf_exempt
@require_POST
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
        if user.owned_company:
            company = user.owned_company
        elif user.active_company:
            company = user.active_company

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

            if quantity <= 0:
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
        product = Product.objects.create(
            name=name,
            cost_price=cost_price,
            selling_price=selling_price,
            category=category,
            product_quantity=quantity,
            company=company,
        )
        return JsonResponse(
            {
                "success": True,
                "message": "Product saved successfully!",
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
        if user.owned_company:
            company = user.owned_company

        if user.active_company:
            company = user.active_company

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

        # grand total amount
        total_amount = (
            (total_amount - global_discount) + global_tax + additional_charges
        )

        remaining_amount = 0
        remaining_amount = Decimal(str(total_amount)) - Decimal(str(received_amount))

        print("this is global_discount-> ", global_discount)

        # Create order summary
        order_summary = OrderSummary.objects.create(
            order=order,
            total_amount=total_amount,
            discount=global_discount,
            tax=global_tax,
            received_amount=received_amount,
            due_amount=remaining_amount,
        )
        # order_summary.calculate_totals()

        for charge in charge_name_amount:
            charge_name = charge.get("chargeName")
            charge_amount = charge.get("chargeAmount")
            # creating additional entry
            AdditionalCharges.objects.create(
                additional_charges=order,
                charge_name=charge_name,
                additional_amount=charge_amount,
            )

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
        if user.owned_company:
            company = user.owned_company

        elif user.active_company:
            company = user.active_company

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


def invoices(request):
    context = get_serialized_data(request.user, "invoices")
    return render(request, "website/bill.html", context)


def clients(request):
    context = get_serialized_data(request.user, "clients")
    return render(request, "website/bill.html", context)


def reports(request):
    context = get_serialized_data(request.user, "reports")
    return render(request, "website/bill.html", context)


def products(request):
    context = get_serialized_data(request.user, "products")
    return render(request, "website/bill.html", context)


def settings(request):
    context = get_serialized_data(request.user, "settings")
    return render(request, "website/bill.html", context)

def product_detail(request):
    context = get_serialized_data(request.user,"dashboard")
    return render(request, "website/product_detail.html",context)

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
