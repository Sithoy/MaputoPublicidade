from django import forms


class ClientSignupForm(forms.Form):
    """Extra fields collected when a client creates a BrandDesk account."""

    first_name = forms.CharField(max_length=150, strip=True)
    last_name = forms.CharField(max_length=150, strip=True)
    company = forms.CharField(max_length=255, required=False, strip=True)
    phone = forms.CharField(max_length=50, required=False, strip=True)
    nuit = forms.CharField(max_length=50, required=False, strip=True)
    password_confirm = forms.CharField(strip=False)
    accept_terms = forms.BooleanField(required=True)

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get("password")
        password_confirm = cleaned_data.get("password_confirm")
        if password and password_confirm and password != password_confirm:
            self.add_error(
                "password_confirm", "As palavras-passe devem ser iguais."
            )
        return cleaned_data

    def signup(self, request, user):
        user.first_name = self.cleaned_data["first_name"]
        user.last_name = self.cleaned_data["last_name"]
        user.save(update_fields=["first_name", "last_name"])

        profile = user.profile
        profile.company = self.cleaned_data.get("company", "")
        profile.phone = self.cleaned_data.get("phone", "")
        profile.nuit = self.cleaned_data.get("nuit", "")
        profile.save(update_fields=["company", "phone", "nuit", "updated_at"])
