"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { AlertCircle, MapPin, Camera, Upload } from "lucide-react";

export default function NewVisitPage() {
  const [loanId, setLoanId] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationAddress, setLocationAddress] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [visitStatus, setVisitStatus] = useState<
    "PTP" | "Not Found" | "Partial Recieved" | "Recieved" | "Others" | ""
  >("");
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Validate 21-digit loan ID
  const isValidLoanId = (id: string) => /^\d{21}$/.test(id);

  // Get current location
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setGeoLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lon);

        // Reverse geocoding using OpenStreetMap Nominatim API
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
            {
              headers: {
                "User-Agent": "loan-collection-tracker",
              },
            },
          );
          const data = await response.json();
          // Nominatim returns the full address in "display_name" at the top level
          setLocationAddress(
            data.display_name || `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
          );
        } catch {
          setLocationAddress(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);
        }
        setGeoLoading(false);
      },
      (error) => {
        setError(`Unable to get location: ${error.message}`);
        setGeoLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  };

  // Compress image before storing
  const processImage = (
    file: File,
    visitId: string,
    locationAddress: string,
  ): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.readAsDataURL(file);

      reader.onload = (event) => {
        if (!event.target?.result) return reject("File read failed");
        img.src = event.target.result as string;
      };

      img.onload = () => {
        const MAX_WIDTH = 1280;

        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = (MAX_WIDTH / width) * height;
          width = MAX_WIDTH;
        }

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject("Canvas error");

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);

        // === WATERMARK ===
        const timestamp = new Date().toLocaleString();

        const watermarkText = `
Visit: ${visitId}
Location: ${locationAddress || "Unknown Location"}
Time: ${timestamp}
`.trim();

        const stripHeight = Math.max(60, canvas.height * 0.08);
        const stripY = canvas.height - stripHeight;

        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(0, stripY, canvas.width, stripHeight);

        const fontSize = Math.max(canvas.width * 0.025, 14);
        ctx.font = `${fontSize}px Arial`;
        ctx.fillStyle = "white";

        const lines = watermarkText.split("\n");
        const lineSpacing = fontSize + 4;

        const totalTextHeight = lines.length * lineSpacing;
        let y = stripY + (stripHeight - totalTextHeight) / 2 + fontSize;

        for (const line of lines) {
          ctx.fillText(line.trim(), 20, y);
          y += lineSpacing;
        }
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject("Compression failed");
            resolve(new File([blob], file.name, { type: "image/jpeg" }));
          },
          "image/jpeg",
          0.7,
        );
      };

      img.onerror = reject;
    });
  };
  // Handle photo selection
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!loanId || latitude === null || longitude === null) {
      setError("Please enter Loan ID and get location before taking photo");
      return;
    }
    if (!e.target.files) return;

    const selectedFiles = Array.from(e.target.files);

    if (photos.length + selectedFiles.length > 3) {
      setError(
        `Maximum 3 photos allowed. You have ${photos.length}, trying to add ${selectedFiles.length}.`,
      );
      return;
    }

    try {
      // Compress images
      const compressedFiles = await Promise.all(
        selectedFiles.map((file) =>
          processImage(
            file,
            loanId, // or visitId if available
            locationAddress,
          ),
        ),
      );

      const totalSize =
        photos.reduce((sum, f) => sum + f.size, 0) +
        compressedFiles.reduce((sum, f) => sum + f.size, 0);

      if (totalSize > 10 * 1024 * 1024) {
        setError("Total photo size must not exceed 10MB");
        return;
      }

      setPhotos([...photos, ...compressedFiles]);
      setError(null);
    } catch (err) {
      setError("Failed to process images");
    }
  };

  // Remove photo
  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  // Submit visit
  const handleSubmitVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validation
      if (!isValidLoanId(loanId)) {
        throw new Error("Loan ID must be exactly 21 digits");
      }
      if (!latitude || !longitude) {
        throw new Error("Please get your location before submitting");
      }
      if (photos.length === 0) {
        throw new Error("At least one photo is required");
      }

      if (!customerName.trim()) {
        throw new Error("Customer name is required");
      }

      if (!visitStatus) {
        throw new Error("Visit status is required");
      }

      const formData = new FormData();
      formData.append("loanId", loanId);
      formData.append("latitude", String(latitude));
      formData.append("longitude", String(longitude));
      formData.append("locationAddress", locationAddress);
      formData.append("customerName", customerName);
      formData.append("visitStatus", visitStatus);
      formData.append("comments", comments);
      photos.forEach((file) => {
        formData.append("photos", file);
      });

      const response = await fetch("/api/visits", {
        method: "POST",
        body: formData,
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error || "Failed to submit visit");
      }

      setSuccess(true);
      setLoanId("");
      setLatitude(null);
      setLongitude(null);
      setLocationAddress("");
      setPhotos([]);
      setCustomerName("");
      setVisitStatus("");
      setComments("");

      // Redirect after success
      setTimeout(() => {
        router.push("/field-agent/new-visit");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Submit New Visit</h1>
        <p className="text-gray-600 mt-2">
          Record a collection visit with location and photos
        </p>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">
            Visit submitted successfully!
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmitVisit} className="space-y-6">
        {/* Loan ID */}
        <Card>
          <CardHeader>
            <CardTitle>Loan Information</CardTitle>
            <CardDescription>Enter the 21-digit loan ID</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="loanId">Loan ID (21 digits)</Label>
              <Input
                id="loanId"
                type="text"
                placeholder="123456789012345678901"
                value={loanId}
                onChange={(e) => setLoanId(e.target.value)}
                maxLength={21}
                required
              />
              {loanId && !isValidLoanId(loanId) && (
                <p className="text-sm text-red-600">
                  Loan ID must be exactly 21 digits
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Only show rest of form when loan ID is valid */}
        {isValidLoanId(loanId) && (
          <>
            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle>Location</CardTitle>
                <CardDescription>
                  Capture GPS coordinates of the visit
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={geoLoading}
                  className="w-full"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  {geoLoading ? "Getting Location..." : "Get Current Location"}
                </Button>

                {latitude && longitude && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-gray-600">
                          Latitude
                        </Label>
                        <p className="font-mono text-sm">
                          {latitude.toFixed(6)}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">
                          Longitude
                        </Label>
                        <p className="font-mono text-sm">
                          {longitude.toFixed(6)}
                        </p>
                      </div>
                    </div>
                    {locationAddress && (
                      <div>
                        <Label className="text-sm text-gray-600">Address</Label>
                        <p className="text-sm text-gray-700 break-words">
                          {locationAddress}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Visit Details */}
            <Card>
              <CardHeader>
                <CardTitle>Visit Details</CardTitle>
                <CardDescription>
                  Information about the person and outcome of the visit
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Name of Person Visited</Label>
                  <Input
                    id="customerName"
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visitStatus">Visit Status</Label>
                  <select
                    id="visitStatus"
                    value={visitStatus}
                    onChange={(e) => setVisitStatus(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-md w-full"
                  >
                    <option value="">Select status</option>
                    <option value="PTP">PTP</option>
                    <option value="Not Found">Not Found</option>
                    <option value="Partial Recieved">Partial Recieved</option>
                    <option value="Recieved">Recieved</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comments">Comments</Label>
                  <textarea
                    id="comments"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Write visit comments here..."
                    className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Camera & Photos */}
            <Card>
              <CardHeader>
                <CardTitle>Photos</CardTitle>
                <CardDescription>
                  Add 1-3 photos (max 10MB total, JPEG/PNG only)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Gallery Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />

                {/* Camera Input */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  capture="environment"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />

                {/* Buttons Row */}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex-1"
                    disabled={photos.length >= 3}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Use Camera
                  </Button>

                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="flex-1"
                    disabled={photos.length >= 3}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Add Photos ({photos.length}/3)
                  </Button>
                </div>

                {photos.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {photos.map((file, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          onClick={() => handleRemovePhoto(index)}
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Remove
                        </Button>
                        <p className="text-xs text-gray-500 mt-1">
                          {(file.size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={
            loading ||
            !isValidLoanId(loanId) ||
            !latitude ||
            !longitude ||
            photos.length === 0 ||
            !customerName.trim() ||
            !visitStatus
          }
          className="w-full"
          size="lg"
        >
          {loading ? "Submitting Visit..." : "Submit Visit"}
        </Button>
      </form>
    </div>
  );
}
