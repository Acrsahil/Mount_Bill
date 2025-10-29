import json
from datetime import datetime

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .models import Bill, Customer, OrderList, OrderSummary, Product, ProductCategory


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
            "price": float(p.price),
            "category": p.category.name if p.category else "",
        }
        for p in products
    ]

    customers_data = [
        {
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "phone": c.phone,
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
    }


@login_required
def bill(request):
    """Main billing page view - SIMPLIFIED"""
    try:
        context = get_serialized_data()
        return render(request, "website/bill.html", context)

    except Exception as e:
        print(f"Error in bill view: {e}")
        return render(
            request,
            "website/bill.html",
            {"product": "[]", "customer": "[]", "product_cat": "[]", "invoices": []},
        )


@login_required
@csrf_exempt
@require_POST
def save_product(request):
    """Save new product via AJAX - CLEANER VALIDATION"""
    try:
        data = json.loads(request.body)
        name = data.get("name", "").strip()
        price = data.get("price")
        category_name = data.get("category", "").strip()

        # Consolidated validation
        if not name:
            return JsonResponse(
                {"success": False, "error": "Product name is required"}, status=400
            )

        try:
            price = float(price)
            if price <= 0:
                return JsonResponse(
                    {"success": False, "error": "Price must be positive"}, status=400
                )
        except (TypeError, ValueError):
            return JsonResponse(
                {"success": False, "error": "Valid price is required"}, status=400
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
        product = Product.objects.create(name=name, price=price, category=category)

        return JsonResponse(
            {
                "success": True,
                "message": "Product saved successfully!",
                "product": {
                    "id": product.id,
                    "name": product.name,
                    "price": float(product.price),
                    "category": product.category.name if product.category else "",
                },
            }
        )

    except Exception as e:
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
                "email": f"{client_name.replace(' ', '.').lower()}@example.com",
                "phone": "000-000-0000",
                "address": "Address not provided",
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

            # Find or create product
            default_category = ProductCategory.objects.first()
            if not default_category:
                default_category = ProductCategory.objects.create(name="General")

            product, _ = Product.objects.get_or_create(
                name=product_name,
                defaults={"price": price, "category": default_category},
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
    ans = pro_id+second_id
    return render(
        request,
        "billingsystem/productprice.html",
        {"pro": pro, "ans": ans},
    )
