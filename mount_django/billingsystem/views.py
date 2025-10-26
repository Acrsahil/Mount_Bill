import json

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .models import Bill, Customer, OrderList, OrderSummary, Product, ProductCategory


@login_required
def bill(request):
    try:
        # Get products and manually convert Decimal to float
        products = Product.objects.select_related("category")
        products_list = []
        for product in products:
            products_list.append(
                {
                    "id": product.id,
                    "name": product.name,
                    "price": float(product.price),  # ← Convert here
                    "category": product.category.name if product.category else "",
                }
            )

        # Get customers
        customers = Customer.objects.all()
        customers_list = []
        for customer in customers:
            customers_list.append(
                {
                    "id": customer.id,
                    "name": customer.name,
                    "email": customer.email,
                    "phone": customer.phone,
                    "address": customer.address,
                }
            )

        product_data = json.dumps(products_list)
        customer_data = json.dumps(customers_list)

        # Get product categories - with proper error handling
        product_categories = ProductCategory.objects.all()
        ProductCategoryList = []
        for pro in product_categories:
            ProductCategoryList.append({"id": pro.id, "name": pro.name})
        product_cat = json.dumps(ProductCategoryList)

        return render(
            request,
            "website/bill.html",
            {
                "product": product_data,
                "customer": customer_data,
                "product_cat": product_cat,
            },
        )

    except Exception as e:
        # Handle any exceptions and provide fallback data
        print(f"Error in bill view: {e}")
        return render(
            request,
            "website/bill.html",
            {
                "product": "[]",
                "customer": "[]",
                "product_cat": "[]",
            },
        )


@login_required
@csrf_exempt
@require_POST
def save_product(request):
    """
    AJAX view to save new products to the database
    """
    try:
        # Parse the JSON data from the request
        data = json.loads(request.body)

        # Extract and validate product data
        name = data.get("name", "").strip()
        price = data.get("price")
        category_name = data.get("category", "").strip()

        # Validation
        if not name:
            return JsonResponse(
                {"success": False, "error": "Product name is required"}, status=400
            )

        try:
            price = float(price)
            if price <= 0:
                raise ValueError("Price must be positive")
        except (TypeError, ValueError):
            return JsonResponse(
                {"success": False, "error": "Valid price is required"}, status=400
            )

        # Check if product already exists (case-insensitive)
        if Product.objects.filter(name__iexact=name).exists():
            return JsonResponse(
                {"success": False, "error": "Product with this name already exists"},
                status=400,
            )

        # Get or create category
        category = None
        if category_name:
            category, created = ProductCategory.objects.get_or_create(
                name=category_name
            )

        # Create the product
        product = Product.objects.create(name=name, price=price, category=category)

        # Return success response with product data
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
    """
    AJAX view to save complete invoices to the database
    """
    print("🟢 save_invoice view called!")

    try:
        # Parse the JSON data from the request
        print("📦 Reading request body...")
        body = request.body.decode("utf-8")
        print("Raw request body:", body)

        data = json.loads(body)
        print("✅ Parsed JSON data")

        # Extract invoice data
        client_name = data.get("clientName", "").strip()
        invoice_date_str = data.get("invoiceDate", "")
        invoice_items = data.get("items", [])
        global_discount = float(data.get("globalDiscount", 0))
        global_tax = float(data.get("globalTax", 0))

        print(f"📋 Extracted data - Client: {client_name}, Items: {len(invoice_items)}")

        # Validation
        if not client_name:
            print("❌ No client name provided")
            return JsonResponse(
                {"success": False, "error": "Client name is required"}, status=400
            )

        if not invoice_items:
            print("❌ No invoice items provided")
            return JsonResponse(
                {"success": False, "error": "At least one invoice item is required"},
                status=400,
            )

        print("👤 Finding or creating customer...")
        # Find or create customer
        customer, created = Customer.objects.get_or_create(
            name=client_name,
            defaults={
                "email": f"{client_name.replace(' ', '.').lower()}@example.com",
                "phone": "000-000-0000",
                "address": "Address not provided",
            },
        )

        if created:
            print(f"✅ Created new customer: {customer.name}")
        else:
            print(f"✅ Found existing customer: {customer.name}")

        print("📋 Creating order...")
        # Handle date conversion - FIXED
        from datetime import datetime

        from django.utils import timezone

        if invoice_date_str:
            try:
                # Convert string to datetime object
                invoice_date = datetime.strptime(invoice_date_str, "%Y-%m-%d").date()
                # Make it timezone-aware
                invoice_date = timezone.make_aware(
                    datetime.combine(invoice_date, datetime.min.time())
                )
                print(f"✅ Converted invoice date: {invoice_date}")
            except ValueError as e:
                print(f"⚠️  Invalid date format, using current time: {e}")
                invoice_date = timezone.now()
        else:
            invoice_date = timezone.now()
            print("✅ Using current date")

        # Create order with proper datetime object
        order = OrderList.objects.create(
            customer=customer,
            order_date=invoice_date,  # This is now a datetime object, not a string
        )
        print(f"✅ Created order: {order.id}")

        # Create bill items
        total_amount = 0
        print(f"📄 Creating {len(invoice_items)} bill items...")

        for index, item in enumerate(invoice_items):
            try:
                print(f"  Processing item {index + 1}: {item}")
                product_name = item.get("productName", "").strip()
                quantity = int(item.get("quantity", 1))
                price = float(item.get("price", 0))
                description = item.get("description", "")

                if not product_name:
                    print(f"  ⚠️  Skipping item {index + 1} - no product name")
                    continue

                print(f"  🔍 Finding/creating product: {product_name}")
                # Find or create product - FIXED category handling
                try:
                    # Get any existing category or create default
                    default_category = ProductCategory.objects.first()
                    if not default_category:
                        default_category = ProductCategory.objects.create(
                            name="General"
                        )

                    product, product_created = Product.objects.get_or_create(
                        name=product_name,
                        defaults={
                            "price": price,
                            "category": default_category,
                        },
                    )

                    if product_created:
                        print(f"  ✅ Created new product: {product.name}")
                    else:
                        print(f"  ✅ Found existing product: {product.name}")

                    print(f"  💰 Creating bill: {product.name} x {quantity}")
                    # Create bill entry
                    bill = Bill.objects.create(
                        order=order,
                        product=product,
                        product_price=price,
                        quantity=quantity,
                        bill_date=timezone.now(),
                    )

                    # Calculate item total
                    item_total = quantity * price
                    total_amount += item_total

                    print(
                        f"  ✅ Created bill item: {product.name} x {quantity} = ${
                            item_total
                        }"
                    )

                except Exception as e:
                    print(f"  ❌ Error with product {product_name}: {e}")
                    continue

            except Exception as e:
                print(f"  ❌ Error creating bill item {index + 1}: {e}")
                import traceback

                traceback.print_exc()
                continue

        print(f"💰 Total amount: ${total_amount}")
        print("📊 Creating order summary...")
        # Create order summary
        order_summary = OrderSummary.objects.create(
            order=order,
            total_amount=total_amount,
            discount=global_discount,
            tax=global_tax,
        )

        # Calculate final totals
        print("🧮 Calculating final totals...")
        order_summary.calculate_totals()
        print(f"✅ Final amount: ${order_summary.final_amount}")

        # Return success response - FIXED date serialization
        response_data = {
            "success": True,
            "message": "Invoice saved successfully!",
            "invoice": {
                "id": order.id,
                "number": f"INV-{order.id:03d}",
                "client": customer.name,
                # This now works because order_date is datetime
                "date": order.order_date.isoformat(),
                "total_amount": order_summary.final_amount,
                "items_count": len(invoice_items),
            },
        }
        print("🎉 Returning success response")
        return JsonResponse(response_data)

    except json.JSONDecodeError as e:
        print(f"❌ JSON decode error: {e}")
        return JsonResponse(
            {"success": False, "error": f"Invalid JSON data: {str(e)}"}, status=400
        )
    except Exception as e:
        print(f"💥 Unexpected error in save_invoice: {str(e)}")
        import traceback

        print("Full traceback:")
        traceback.print_exc()
        return JsonResponse(
            {"success": False, "error": f"Server error: {str(e)}"}, status=500
        )


def sahilpage(request):
    return render(request, "billingsystem/index.html")
