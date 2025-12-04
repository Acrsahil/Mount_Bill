import json
from datetime import datetime

from django.contrib.auth.decorators import login_required
from django.core.serializers import serialize
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .models import (
    Bill,
    Customer,
    OrderList,
    OrderSummary,
    Product,
    ProductCategory,
)


def get_serialized_data():
    """Helper function to get serialized data for template - REDUCED DUPLICATION"""
    products = Product.objects.select_related("category").all()
    customers = Customer.objects.all()
    categories = ProductCategory.objects.all()
    orderlist = OrderList.objects.all()

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
                        "amount": summary.final_amount,
                        "status": "pending",  # You can add status if needed
                    }
                )
    print(invoice_data)

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
        }
        for c in customers
    ]

    categories_data = [{"id": cat.id, "name": cat.name} for cat in categories]

    return {
        "product": json.dumps(products_data),
        "customer": json.dumps(customers_data),
        "product_cat": json.dumps(categories_data),
        "invoices": json.dumps(invoice_data),
    }


@login_required
def dashboard(request):
    """Main billing page view - SIMPLIFIED"""
    try:
        # Get both common context and serialized data
        context = get_common_context("dashboard")  # Set active_tab="dashboard"
        serialized_data = get_serialized_data()

        # Merge both dictionaries
        context.update(serialized_data)
        print(context)
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
        print("=== DEBUG SAVE PRODUCT ===")
        print("Raw request body:", request.body.decode("utf-8"))

        data = json.loads(request.body)
        print("Parsed data:", data)
        print("Data keys:", list(data.keys()))

        name = data.get("name", "").strip()
        category_name = data.get("category", "").strip()

        # Handle both old and new price formats
        cost_price = data.get("cost_price")
        selling_price = data.get("selling_price")
        quantity = data.get("quantity")
        # If using old format with single 'price' field
        if cost_price is None and selling_price is None and "price" in data:
            cost_price = data.get("price")
            selling_price = data.get("price")  # Use same price for both
            print("Using old price format - single price field")

        print(
            f"Extracted - name: '{name}', cost_price: {cost_price}, selling_price: {
                selling_price
            }"
        )

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
            quantity = quantity
            
            if quantity<=0:
                return JsonResponse(
                    {"success": False,"error":"Product quantity cannot be 0 or less."}, 
                    status=400
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
        if Product.objects.filter(name__iexact=name).exists():
            return JsonResponse(
                {"success": False, "error": "Product already exists"}, status=400
            )

        # Get or create category
        category = None
        if category_name:
            category, _ = ProductCategory.objects.get_or_create(name=category_name)

        # Create product
        product = Product.objects.create(
            name=name,
            cost_price=cost_price,
            selling_price=selling_price,
            category=category,
            quantity=quantity,
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
                    "quantity":product.quantity,
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
def save_invoice(request):
    """Save complete invoice via AJAX - REMOVED REDUNDANT CODE"""
    try:
        data = json.loads(request.body)
        client_name = data.get("clientName", "").strip()
        invoice_date_str = data.get("invoiceDate", "")
        invoice_items = data.get("items", [])
        global_discount = float(data.get("globalDiscount", 0))
        global_tax = float(data.get("globalTax", 0))

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
        order = OrderList.objects.create(customer=customer, order_date=invoice_date)

        # Process invoice items
        total_amount = 0
        for item in invoice_items:
            product_name = item.get("productName", "").strip()
            quantity = int(item.get("quantity", 1))
            price = float(item.get("price", 0))

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
                    "cost_price": price * 0.8,
                    "selling_price": price,
                    "category": default_category,
                },
            )

            # Create bill entry
            Bill.objects.create(
                order=order,
                product=product,
                product_price=price,
                quantity=quantity,
                bill_date=timezone.now(),
            )

            total_amount += quantity * price

        # Create order summary
        order_summary = OrderSummary.objects.create(
            order=order,
            total_amount=total_amount,
            discount=global_discount,
            tax=global_tax,
        )
        order_summary.calculate_totals()

        return JsonResponse(
            {
                "success": True,
                "message": "Invoice saved successfully!",
                "invoice": {
                    "id": order.id,
                    "number": f"INV-{order.id:03d}",
                    "client": customer.name,
                    "date": order.order_date.isoformat(),
                    "total_amount": order_summary.final_amount,
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
        user = request.user

        company = None
        if user.owned_company:
            company = user.owned_company

        elif user.active_company:
            company = user.active_company

        if company:
            client = Customer.objects.create(company=company, name=name, phone=phone)
            return JsonResponse(
                {
                    "success": True,
                    "message": "Client saved successfully!",
                    "client": {
                        "id": client.id,
                        "name": client.name,
                        "phone": client.phone,
                    },
                }
            )

    except Exception as e:
        return JsonResponse({"success": False, "error": f"Server error: {str(e)}"})


@login_required
@csrf_exempt
@require_POST
def delete_invoice(request, id):
    print(f"Request method is: {request.method}")
    if request.method == "POST":
        try:
            order_list = OrderList.objects.get(id=id)
            order_list.delete()
            return JsonResponse({"success": True})
        except OrderList.DoesNotExist:
            return JsonResponse({"success": False, "error": "Not found"})


def get_common_context(active_tab="dashboard"):
    """Common context for all dashboard views"""
    products_json = serialize("json", Product.objects.all())
    customers_json = serialize("json", Customer.objects.all())
    invoices_json = serialize("json", OrderList.objects.all())
    categories = Product.objects.values_list("category", flat=True).distinct()

    return {
        "product": products_json,
        "product_cat": json.dumps(list(categories)),
        "customer": customers_json,
        "invoices": invoices_json,
        "active_tab": active_tab,  # This is the key!
    }


def invoices(request):
    context = get_common_context("invoices")
    return render(request, "website/bill.html", context)


def clients(request):
    context = get_common_context("clients")
    return render(request, "website/bill.html", context)


def reports(request):
    context = get_common_context("reports")
    return render(request, "website/bill.html", context)


def products(request):
    context = get_common_context("products")
    return render(request, "website/bill.html", context)


def settings(request):
    context = get_common_context("settings")
    return render(request, "website/bill.html", context)
