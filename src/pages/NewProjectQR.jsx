import { useState, useEffect, useRef } from "react";
import { base44Public } from "@/components/PublicAPIClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, CheckCircle, AlertCircle, Loader2, Upload, X } from "lucide-react";

export default function NewProjectQR() {
  const [token, setToken] = useState(null);
  const [files, setFiles] = useState([]);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    let foundToken = urlParams.get('token');
    
    if (!foundToken && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
      foundToken = hashParams.get('token');
    }
    
    console.log('Extracted project token:', foundToken);
    setToken(foundToken);
  }, []);

  const { data: client, isLoading: clientLoading, error: clientError } = useQuery({
    queryKey: ['client-project', token],
    queryFn: async () => {
      if (!token) return null;
      
      const response = await base44Public.functions.invoke('validateProjectToken', { token });
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      return response.data.client;
    },
    enabled: !!token,
    retry: false
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data) => {
      // Upload files if any
      let fileUrls = [];
      if (files.length > 0) {
        for (const file of files) {
          const { file_url } = await base44Public.integrations.Core.UploadFile({ file });
          fileUrls.push(file_url);
        }
      }

      return await base44Public.entities.Project.create({
        tenant_id: client.tenant_id,
        client_id: client.id,
        title: data.title,
        description: data.description,
        status: 'open',
        priority: data.priority || 'medium',
        file_urls: fileUrls.length > 0 ? fileUrls : undefined
      });
    },
    onSuccess: () => {
      setSuccess(true);
    },
  });

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    createProjectMutation.mutate({
      title: formData.get('title'),
      description: formData.get('description'),
      priority: formData.get('priority')
    });
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
            <CardTitle className="text-2xl">Invalid Link</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600">
              This link appears to be incomplete. Please scan a valid project submission QR code.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (clientLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 to-red-700 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Invalid QR Code</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-3">
            <p className="text-gray-600">
              This project submission QR code is not valid or has expired.
            </p>
            {clientError && (
              <p className="text-sm text-red-600 font-mono bg-red-50 p-2 rounded">
                Error: {clientError.message}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <CardTitle className="text-3xl text-green-700">Project Submitted!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-lg text-gray-700">
              Your project request for <strong>{client.name}</strong> has been submitted successfully.
            </p>
            <p className="text-sm text-gray-500">
              Our team will review it and get back to you shortly.
            </p>
            <div className="pt-6">
              <Button 
                onClick={() => window.location.reload()}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Submit Another Project
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <FolderKanban className="w-7 h-7" />
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
                  placeholder="Describe the work needed, location, and any specific requirements..."
                  className="h-32"
                />
              </div>

              <div>
                <label htmlFor="priority" className="text-lg font-medium text-gray-700 block mb-2">
                  Priority
                </label>
                <select
                  id="priority"
                  name="priority"
                  className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium" selected>Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="text-lg font-medium text-gray-700 block mb-2">
                  <Upload className="w-5 h-5 inline mr-2" />
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
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <span className="text-sm text-gray-600">Click to upload files</span>
                  </div>
                </Button>

                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="ml-2 text-red-600 hover:text-red-700"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={createProjectMutation.isPending}
                className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {createProjectMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting Project...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
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