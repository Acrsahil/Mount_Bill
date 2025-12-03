from django.shortcuts import render


def landing_page(request):
    return render(request, "website/landing_page.html")


# def home(request):
#     if request.user.is_authenticated:
#         return redirect("bill")
#     else:
#         return redirect("login")
