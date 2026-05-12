import React, { useState } from "react";
import { entities } from "@/lib/db";
import { uploadFile } from "@/lib/storage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, Building2, Palette, Mail, Phone, User, Upload, CheckCircle, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import QueryErrorState from "@/components/QueryErrorState";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/lib/toast";
import { reportError } from "@/lib/error-reporting";

export default function Settings() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;
  const queryClient = useQueryClient();
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const tenantQuery = useQuery({
    queryKey: ["tenant", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const tenants = await entities.Tenant.filter({ id: tenantId });
      return tenants?.[0] ?? null;
    },
    enabled: !!tenantId,
  });

  const updateTenantMutation = useMutation({
    mutationFn: (data) => entities.Tenant.update(tenantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant"] });
      toast.success("Settings saved");
    },
    onError: (error) => {
      reportError(error, { where: "Settings.update" });
      toast.error(`Failed to save settings: ${error?.message ?? "Unknown error"}`);
    },
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const { file_url } = await uploadFile({ file, folder: "logos" });
      await updateTenantMutation.mutateAsync({ logo_url: file_url });
    } catch (error) {
      reportError(error, { where: "Settings.handleLogoUpload" });
      toast.error("Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    updateTenantMutation.mutate({
      name: formData.get("name"),
      tagline: formData.get("tagline"),
      contact_name: formData.get("contact_name"),
      contact_email: formData.get("contact_email"),
      contact_phone: formData.get("contact_phone"),
      brand_color: formData.get("brand_color"),
      company_name_color: formData.get("company_name_color"),
    });
  };

  if (tenantQuery.error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 max-w-4xl mx-auto">
        <QueryErrorState error={tenantQuery.error} onRetry={() => tenantQuery.refetch()} />
      </div>
    );
  }

  if (tenantQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  const tenant = tenantQuery.data;
  if (!tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" aria-hidden="true" />
            <h3 className="text-lg font-semibold mb-2">Tenant Not Found</h3>
            <p className="text-gray-600">Unable to load your company settings.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl flex items-center justify-center">
              <SettingsIcon className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600">Manage your company branding and QR code design</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="shadow-md">
            <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-emerald-100">
              <div className="flex items-center gap-3">
                <Building2 className="w-6 h-6 text-emerald-700" aria-hidden="true" />
                <CardTitle>Company Branding</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div>
                <Label className="text-base font-semibold mb-3 block">Company Logo</Label>
                <div className="flex items-center gap-6">
                  {tenant.logo_url ? (
                    <img
                      src={tenant.logo_url}
                      alt="Company Logo"
                      className="h-24 w-auto max-w-xs object-contain border-2 border-gray-200 rounded-lg p-2 bg-white"
                    />
                  ) : (
                    <div className="h-24 w-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                      <Upload className="w-8 h-8 text-gray-400" aria-hidden="true" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      id="logo-upload"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById("logo-upload").click()}
                      disabled={uploadingLogo}
                    >
                      {uploadingLogo ? (
                        "Uploading…"
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" aria-hidden="true" />
                          {tenant.logo_url ? "Change Logo" : "Upload Logo"}
                        </>
                      )}
                    </Button>
                    <p className="text-sm text-gray-500 mt-2">
                      Recommended: PNG with transparent background, max height 100px
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="name" className="text-base font-semibold">
                  Company Name *
                </Label>
                <Input
                  id="name"
                  name="name"
                  required
                  defaultValue={tenant.name}
                  placeholder="e.g., GreenPoint"
                  className="mt-2 h-12 text-base"
                />
              </div>

              <div>
                <Label htmlFor="tagline" className="text-base font-semibold">
                  Tagline
                </Label>
                <Input
                  id="tagline"
                  name="tagline"
                  defaultValue={tenant.tagline}
                  placeholder="e.g., Clean Spaces • Smooth Operations • Trusted Care"
                  className="mt-2 h-12 text-base"
                />
                <p className="text-sm text-gray-500 mt-1">Appears below company name on QR codes</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="brand_color" className="text-base font-semibold">
                    Accent Line Color
                  </Label>
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="color"
                      id="brand_color"
                      name="brand_color"
                      defaultValue={tenant.brand_color ?? "#1B7A3D"}
                      className="h-12 w-20 cursor-pointer rounded-lg border-2 border-gray-300"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="company_name_color" className="text-base font-semibold">
                    Company Name Color
                  </Label>
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="color"
                      id="company_name_color"
                      name="company_name_color"
                      defaultValue={tenant.company_name_color ?? "#000000"}
                      className="h-12 w-20 cursor-pointer rounded-lg border-2 border-gray-300"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-purple-100">
              <div className="flex items-center gap-3">
                <Mail className="w-6 h-6 text-purple-600" aria-hidden="true" />
                <CardTitle>Contact Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <p className="text-gray-600">
                This information appears in the &quot;Questions?&quot; section at the bottom of QR codes.
              </p>

              <div>
                <Label htmlFor="contact_name" className="text-base font-semibold">
                  <User className="w-4 h-4 inline mr-2" aria-hidden="true" />
                  Contact Name
                </Label>
                <Input
                  id="contact_name"
                  name="contact_name"
                  defaultValue={tenant.contact_name}
                  className="mt-2 h-12 text-base"
                />
              </div>

              <div>
                <Label htmlFor="contact_email" className="text-base font-semibold">
                  <Mail className="w-4 h-4 inline mr-2" aria-hidden="true" />
                  Contact Email
                </Label>
                <Input
                  id="contact_email"
                  name="contact_email"
                  type="email"
                  defaultValue={tenant.contact_email}
                  className="mt-2 h-12 text-base"
                />
              </div>

              <div>
                <Label htmlFor="contact_phone" className="text-base font-semibold">
                  <Phone className="w-4 h-4 inline mr-2" aria-hidden="true" />
                  Contact Phone
                </Label>
                <Input
                  id="contact_phone"
                  name="contact_phone"
                  type="tel"
                  defaultValue={tenant.contact_phone}
                  className="mt-2 h-12 text-base"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md border-2 border-emerald-200">
            <CardHeader className="border-b bg-gradient-to-r from-emerald-600 to-emerald-700 text-white">
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" aria-hidden="true" />
                QR Code Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="max-w-md mx-auto bg-white border-2 border-gray-200 rounded-xl p-8 text-center">
                <div className="text-2xl font-bold mb-2 text-gray-900">YOUR CLIENT</div>
                <div
                  className="h-1 mb-4"
                  style={{ backgroundColor: tenant.brand_color ?? "#1B7A3D" }}
                />
                <p className="text-gray-700 mb-6">Scan the QR code below to share your feedback.</p>
                <div className="bg-gray-100 h-48 flex items-center justify-center mb-6 rounded">
                  <span className="text-gray-400 text-sm uppercase tracking-wide">QR Preview</span>
                </div>
                {tenant.contact_name || tenant.contact_email ? (
                  <p className="text-sm text-gray-700 mb-6">
                    Questions? {tenant.contact_name ?? ""}
                    {tenant.contact_email ? ` • ${tenant.contact_email}` : ""}
                  </p>
                ) : null}
                <div className="flex items-center justify-center gap-3 mb-2">
                  {tenant.logo_url ? <img src={tenant.logo_url} alt="Logo" className="h-16 w-auto object-contain" /> : null}
                  <div
                    className="text-3xl font-bold leading-tight"
                    style={{ color: tenant.company_name_color ?? "#000000" }}
                  >
                    {tenant.name ?? "YOUR COMPANY"}
                  </div>
                </div>
                {tenant.tagline ? <p className="text-sm italic text-gray-600 mt-2">{tenant.tagline}</p> : null}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end">
            <Button
              type="submit"
              disabled={updateTenantMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 h-12 px-8 text-base"
            >
              {updateTenantMutation.isPending ? (
                "Saving…"
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" aria-hidden="true" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
