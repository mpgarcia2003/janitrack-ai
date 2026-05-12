import { useState, useEffect, useRef } from "react";
import { apiInvoke } from "@/lib/api-client";
import { uploadFile } from "@/lib/storage";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, CheckCircle, AlertCircle, Loader2, Upload, X } from "lucide-react";
import { reportError } from "@/lib/error-reporting";
import { trackEvent, EVENTS } from "@/lib/analytics";

function readToken() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  let token = params.get("token");
  if (!token && window.location.hash) {
    const hashParams = new URLSearchParams(window.location.hash.split("?")[1] ?? "");
    token = hashParams.get("token");
  }
  return token;
}

export default function NewProjectQR() {
  const [token, setToken] = useState(null);
  const [files, setFiles] = useState([]);
  const [success, setSuccess] = useState(false);
  const [submitterName, setSubmitterName] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    setToken(readToken());
  }, []);

  const clientQuery = useQuery({
    queryKey: ["project-token", token],
    queryFn: async () => {
      const response = await apiInvoke("validate-project-token", { token });
      if (response.data?.error) throw new Error(response.data.error);
      return response.data.client;
    },
    enabled: !!token,
    retry: false,
  });

  const client = clientQuery.data ?? null;

  const createMutation = useMutation({
    mutationFn: async (values) => {
      let file_urls = [];
      if (files.length > 0) {
        for (const file of files) {
          const { file_url } = await uploadFile({ file, folder: "projects" });
          file_urls.push(file_url);
        }
      }

      const response = await apiInvoke("create-work-request", {
        token,
        title: values.title,
        description: values.description,
        priority: values.priority,
        submitted_by_name: values.submitterName || undefined,
        submitted_by_email: values.submitterEmail || undefined,
        file_urls,
      });
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: (data) => {
      setSuccess(true);
      trackEvent(EVENTS.PROJECT_CREATED, { project_id: data?.project_id, client_id: client?.id });
    },
    onError: (error) => reportError(error, { where: "NewProjectQR.createWorkRequest" }),
  });

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...selectedFiles]);
  };

  const removeFile = (index) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    createMutation.mutate({
      title: formData.get("title"),
      description: formData.get("description"),
      priority: formData.get("priority"),
      submitterName,
      submitterEmail,
    });
  };

  if (!token) {
    return (
      <Centered bg="from-blue-50 to-indigo-50">
        <SimpleCard
          icon={<AlertCircle className="w-8 h-8 text-orange-600" />}
          title="Invalid Link"
          body="This link appears to be incomplete. Please scan a valid project submission QR code."
        />
      </Centered>
    );
  }

  if (clientQuery.isLoading) {
    return (
      <Centered bg="from-blue-50 to-indigo-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" aria-hidden="true" />
          <p className="text-gray-600">Loading…</p>
        </div>
      </Centered>
    );
  }

  if (clientQuery.isError || !client) {
    return (
      <Centered bg="from-red-900 to-red-700">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Invalid QR Code</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-3">
            <p className="text-gray-600">This project submission QR code is not valid or has expired.</p>
            {clientQuery.error ? (
              <p className="text-sm text-red-600 font-mono bg-red-50 p-2 rounded">
                {clientQuery.error.message}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </Centered>
    );
  }

  if (success) {
    return (
      <Centered bg="from-emerald-50 to-emerald-100">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-emerald-600" />
            </div>
            <CardTitle className="text-3xl text-emerald-700">Project Submitted!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-lg text-gray-700">
              Your project request for <strong>{client.name}</strong> has been submitted.
            </p>
            <p className="text-sm text-gray-500">Our team will review it and get back to you shortly.</p>
            <div className="pt-6">
              <Button onClick={() => window.location.reload()} className="w-full bg-emerald-600 hover:bg-emerald-700">
                Submit Another Project
              </Button>
            </div>
          </CardContent>
        </Card>
      </Centered>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <FolderKanban className="w-7 h-7" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-2xl">Submit New Project</CardTitle>
                <p className="text-blue-100 text-sm">{client.name}</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="title" className="text-lg font-medium text-gray-700 block mb-2">
                  Project Title *
                </label>
                <Input
                  id="title"
                  name="title"
                  required
                  placeholder="e.g., Floor waxing needed in hallway"
                  className="h-12 text-lg"
                />
              </div>

              <div>
                <label htmlFor="description" className="text-lg font-medium text-gray-700 block mb-2">
                  Description *
                </label>
                <Textarea
                  id="description"
                  name="description"
                  required
                  placeholder="Describe the work needed, location, and any specific requirements…"
                  className="h-32"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="submitterName" className="text-sm font-medium text-gray-700 block mb-2">
                    Your Name (Optional)
                  </label>
                  <Input
                    id="submitterName"
                    type="text"
                    value={submitterName}
                    onChange={(e) => setSubmitterName(e.target.value)}
                    placeholder="Name"
                  />
                </div>
                <div>
                  <label htmlFor="submitterEmail" className="text-sm font-medium text-gray-700 block mb-2">
                    Your Email (Optional)
                  </label>
                  <Input
                    id="submitterEmail"
                    type="email"
                    value={submitterEmail}
                    onChange={(e) => setSubmitterEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="priority" className="text-lg font-medium text-gray-700 block mb-2">
                  Priority
                </label>
                <select
                  id="priority"
                  name="priority"
                  defaultValue="medium"
                  className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="text-lg font-medium text-gray-700 block mb-2">
                  <Upload className="w-5 h-5 inline mr-2" aria-hidden="true" />
                  Attach Photos/Files (Optional)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-24 border-2 border-dashed border-gray-300 hover:border-blue-500"
                >
                  <div className="text-center">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" aria-hidden="true" />
                    <span className="text-sm text-gray-600">Click to upload files</span>
                  </div>
                </Button>

                {files.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {files.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${file.name}`}
                          onClick={() => removeFile(index)}
                          className="ml-2 text-red-600 hover:text-red-700"
                        >
                          <X className="w-5 h-5" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {createMutation.isError ? (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">
                  {createMutation.error?.message ?? "Failed to submit project."}
                </p>
              ) : null}

              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" aria-hidden="true" />
                    Submitting Project…
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" aria-hidden="true" />
                    Submit Project
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Centered({ bg, children }) {
  return (
    <div className={`min-h-screen bg-gradient-to-br ${bg} flex items-center justify-center p-4`}>{children}</div>
  );
}

function SimpleCard({ icon, title, body }) {
  return (
    <Card className="max-w-md w-full shadow-xl">
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          {icon}
        </div>
        <CardTitle className="text-2xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-gray-600">{body}</p>
      </CardContent>
    </Card>
  );
}
