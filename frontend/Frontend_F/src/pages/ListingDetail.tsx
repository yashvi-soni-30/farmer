import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChatDialog } from "@/components/ChatDialog";
import { MapPin, Calendar, User, ArrowLeft, CheckCircle, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { apiClient } from "@/lib/api";
import { listingResponseToListing } from "@/lib/listingMapper";
import type { Listing } from "@/types/listing";

const ListingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const loadListing = useCallback(async () => {
    if (!id) {
      setError("Missing listing ID.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await apiClient.getListingById(id);
      setListing(listingResponseToListing(response));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load listing.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadListing();
  }, [loadListing]);

  const handleBook = async () => {
    if (!listing) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to book.");
      return;
    }

    const start = new Date().toISOString().split("T")[0];
    const end = new Date(Date.now() + 86400000).toISOString().split("T")[0];

    try {
      const { error } = await supabase.from("bookings").insert({
        listing_id: listing.id,
        renter_id: user.id,
        owner_id: listing.ownerId ?? "00000000-0000-0000-0000-000000000000",
        start_date: start,
        end_date: end,
        total_price: listing.price,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Booking request sent.");
      navigate("/bookings");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create booking.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">Loading...</div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-2">Listing unavailable</h1>
          <p className="text-muted-foreground mb-4">{error || "Unable to find listing"}</p>
          <Button onClick={() => navigate("/browse")}>Back to Browse</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/browse")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left side */}
          <div className="lg:col-span-2 space-y-6">
            <div className="aspect-video rounded-lg overflow-hidden bg-muted">
              <img src={listing.image} alt={listing.title} className="w-full h-full object-cover" />
            </div>

            <div>
              <Badge className="mb-2">{listing.type}</Badge>
              <h1 className="text-3xl font-bold">{listing.title}</h1>

              <div className="flex flex-wrap gap-4 text-muted-foreground my-4">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {listing.location}
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" /> {listing.ownerName}
                </span>
                {listing.area && (
                  <span>{listing.area} acres</span>
                )}
                {listing.condition && (
                  <span className="capitalize flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" /> {listing.condition}
                  </span>
                )}
              </div>

              <h2 className="text-xl font-semibold mb-1">Description</h2>
              <p className="text-muted-foreground">{listing.description}</p>
            </div>
          </div>

          {/* Right side */}
          <div>
            <Card className="sticky top-20">
              <CardContent className="space-y-4 pt-6">
                <div className="text-3xl font-bold text-primary">
                  ₹{listing.price.toLocaleString()}
                </div>
                <div className="text-muted-foreground mb-4">per {listing.period}</div>

                <Button className="w-full" size="lg" variant="outline" onClick={() => setChatOpen(true)}>
                  <MessageCircle className="mr-2 h-4 w-4" /> Chat with Seller
                </Button>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleBook}
                  disabled={!listing.available}
                >
                  <Calendar className="mr-2 h-4 w-4" /> Book Now
                </Button>

                <p className="text-xs text-center text-muted-foreground">Contact seller or book directly</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <ChatDialog
          open={chatOpen}
          onOpenChange={setChatOpen}
          listingId={listing.id}
          receiverId={listing.ownerId!}
          receiverName={listing.ownerName}
        />
      </div>
    </div>
  );
};

export default ListingDetail;
