
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Settings as SettingsIcon, 
  Building2, 
  Palette, 
  Mail, 
  Phone, 
  User,
  Upload,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import AuthGuard from "../components/AuthGuard";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success', 'error', null
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant', user?.tenant_id],
    queryFn: async () => {
      if (!user?.tenant_id) return null;
      const tenants = await base44.entities.Tenant.list();
      return tenants.find(t => t.id === user.tenant_id) || null;
    },
    enabled: !!user?.tenant_id,
  });

  const updateTenantMutation = useMutation({
    mutationFn: (data) => base44.entities.Tenant.update(user.tenant_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant'] });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    },
    onError: () => {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await updateTenantMutation.mutateAsync({
        ...tenant,
        logo_url: file_url
      });
    } catch (error) {
      console.error('Logo upload error:', error);
      alert('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    updateTenantMutation.mutate({
      ...tenant,
      name: formData.get('name'),
      tagline: formData.get('tagline'),
      contact_name: formData.get('contact_name'),
      contact_email: formData.get('contact_email'),
      contact_phone: formData.get('contact_phone'),
      brand_color: formData.get('brand_color'),
      company_name_color: formData.get('company_name_color'),
    });
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (!tenant) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Tenant Not Found</h3>
              <p className="text-gray-600">Unable to load your company settings.</p>
            </CardContent>
          </Card>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <SettingsIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                  Settings
                </h1>
                <p className="text-gray-600">Manage your company branding and QR code design</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Branding */}
            <Card className="shadow-md">
              <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-blue-100">
                <div className="flex items-center gap-3">
                  <Building2 className="w-6 h-6 text-blue-600" />
                  <CardTitle>Company Branding</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Logo Upload */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">Company Logo</Label>
                  <div className="flex items-center gap-6">
                    {tenant.logo_url ? (
                      <div className="relative">
                        <img 
                          src={tenant.logo_url} 
                          alt="Company Logo" 
                          className="h-24 w-auto max-w-xs object-contain border-2 border-gray-200 rounded-lg p-2 bg-white"
                        />
                      </div>
                    ) : (
                      <div className="h-24 w-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                        <Upload className="w-8 h-8 text-gray-400" />
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
                        onClick={() => document.getElementById('logo-upload').click()}
                        disabled={uploadingLogo}
                      >
                        {uploadingLogo ? (
                          <>Uploading...</>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            {tenant.logo_url ? 'Change Logo' : 'Upload Logo'}
                          </>
                        )}
                      </Button>
                      <p className="text-sm text-gray-500 mt-2">
                        Recommended: PNG with transparent background, max height 100px
                      </p>
                    </div>
                  </div>
                </div>

                {/* Company Name */}
                <div>
                  <Label htmlFor="name" className="text-base font-semibold">Company Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    defaultValue={tenant.name}
                    placeholder="e.g., GreenPoint"
                    className="mt-2 h-12 text-base"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Main company name (appears with logo)
                  </p>
                </div>

                {/* Tagline */}
                <div>
                  <Label htmlFor="tagline" className="text-base font-semibold">Tagline</Label>
                  <Input
                    id="tagline"
                    name="tagline"
                    defaultValue={tenant.tagline}
                    placeholder="e.g., Clean Spaces • Smooth Operations • Trusted Care"
                    className="mt-2 h-12 text-base"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Appears below company name on QR codes
                  </p>
                </div>

                {/* Brand Colors */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="brand_color" className="text-base font-semibold">Accent Line Color</Label>
                    <div className="flex items-center gap-3 mt-2">
                      <input
                        type="color"
                        id="brand_color"
                        name="brand_color"
                        defaultValue={tenant.brand_color || '#10b981'}
                        className="h-12 w-20 cursor-pointer rounded-lg border-2 border-gray-300"
                        onChange={(e) => {
                          document.getElementById('brand_color_text').value = e.target.value;
                        }}
                      />
                      <Input
                        type="text"
                        id="brand_color_text"
                        defaultValue={tenant.brand_color || '#10b981'}
                        placeholder="#10b981"
                        className="h-12 flex-1"
                        onChange={(e) => {
                          document.getElementById('brand_color').value = e.target.value;
                        }}
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Color for the horizontal line
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="company_name_color" className="text-base font-semibold">Company Name Color</Label>
                    <div className="flex items-center gap-3 mt-2">
                      <input
                        type="color"
                        id="company_name_color"
                        name="company_name_color"
                        defaultValue={tenant.company_name_color || '#000000'}
                        className="h-12 w-20 cursor-pointer rounded-lg border-2 border-gray-300"
                        onChange={(e) => {
                          document.getElementById('company_name_color_text').value = e.target.value;
                        }}
                      />
                      <Input
                        type="text"
                        id="company_name_color_text"
                        defaultValue={tenant.company_name_color || '#000000'}
                        placeholder="#000000"
                        className="h-12 flex-1"
                        onChange={(e) => {
                          document.getElementById('company_name_color').value = e.target.value;
                        }}
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Color for company name text
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card className="shadow-md">
              <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-purple-100">
                <div className="flex items-center gap-3">
                  <Mail className="w-6 h-6 text-purple-600" />
                  <CardTitle>Contact Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <p className="text-gray-600">
                  This information appears in the "Questions?" section at the bottom of QR codes.
                </p>

                <div>
                  <Label htmlFor="contact_name" className="text-base font-semibold">
                    <User className="w-4 h-4 inline mr-2" />
                    Contact Name
                  </Label>
                  <Input
                    id="contact_name"
                    name="contact_name"
                    defaultValue={tenant.contact_name}
                    placeholder="e.g., Miguel"
                    className="mt-2 h-12 text-base"
                  />
                </div>

                <div>
                  <Label htmlFor="contact_email" className="text-base font-semibold">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Contact Email
                  </Label>
                  <Input
                    id="contact_email"
                    name="contact_email"
                    type="email"
                    defaultValue={tenant.contact_email}
                    placeholder="e.g., info@greenpointms.com"
                    className="mt-2 h-12 text-base"
                  />
                </div>

                <div>
                  <Label htmlFor="contact_phone" className="text-base font-semibold">
                    <Phone className="w-4 h-4 inline mr-2" />
                    Contact Phone
                  </Label>
                  <Input
                    id="contact_phone"
                    name="contact_phone"
                    type="tel"
                    defaultValue={tenant.contact_phone}
                    placeholder="e.g., (555) 123-4567"
                    className="mt-2 h-12 text-base"
                  />
                </div>
              </CardContent>
            </Card>

            {/* QR Code Preview */}
            <Card className="shadow-md border-2 border-blue-200">
              <CardHeader className="border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  QR Code Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="max-w-md mx-auto bg-white border-2 border-gray-200 rounded-xl p-8 text-center">
                  {/* Client Name at Top */}
                  <div className="text-2xl font-bold mb-2 text-gray-900">ST. JOHN'S PREP</div>
                  {/* Removed: <div className="text-xl font-bold mb-3 text-gray-900">FACILITY FEEDBACK</div> */}
                  <div 
                    className="h-1 mb-4" 
                    style={{ backgroundColor: tenant.brand_color || '#10b981' }}
                  />
                  <p className="text-gray-700 mb-6">
                    Scan the QR code below to share your feedback.
                  </p>
                  <div className="bg-gray-100 h-48 flex items-center justify-center mb-6">
                    <div className="text-6xl">📱</div>
                  </div>
                  {(tenant.contact_name || tenant.contact_email) && (
                    <p className="text-sm text-gray-700 mb-6">
                      Questions? {tenant.contact_name || 'Contact'}
                      {tenant.contact_email && ` • ${tenant.contact_email}`}
                      {/* Removed: {tenant.contact_phone && ` • ${tenant.contact_phone}`} */}
                    </p>
                  )}
                  
                  {/* Logo + Company Name Side by Side */}
                  <div className="flex items-center justify-center gap-3 mb-2">
                    {tenant.logo_url && (
                      <img 
                        src={tenant.logo_url} 
                        alt="Logo" 
                        className="h-16 w-auto object-contain"
                      />
                    )}
                    <div> {/* Removed 'text-left' to allow parent text-center to apply */}
                      <div 
                        className="text-3xl font-bold leading-tight"
                        style={{ color: tenant.company_name_color || '#000000' }}
                      >
                        {tenant.name || 'YOUR COMPANY'}
                      </div>
                      {/* Removed: <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">MAINTENANCE SERVICES</div> */}
                    </div>
                  </div>
                  
                  {tenant.tagline && (
                    <p className="text-sm italic text-gray-600 mt-2">{tenant.tagline}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex items-center justify-between">
              <div>
                {saveStatus === 'success' && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">Settings saved successfully!</span>
                  </div>
                )}
                {saveStatus === 'error' && (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-semibold">Failed to save settings</span>
                  </div>
                )}
              </div>
              <Button
                type="submit"
                disabled={updateTenantMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 h-12 px-8 text-base"
              >
                {updateTenantMutation.isPending ? (
                  <>Saving...</>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AuthGuard>
  );
}
