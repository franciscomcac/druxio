import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useModeration } from "@/hooks/use-moderation";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Send,
  Video,
  Phone,
  MoreVertical,
  Clock,
  Star,
  ArrowLeft,
  Loader2,
  Image as ImageIcon,
  Code,
  Smile,
  X,
  ExternalLink,
  LinkIcon,
} from "lucide-react";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_read: boolean;
  image_urls: string[] | null;
}

interface SessionData {
  id: string;
  mentor_id: string;
  mentee_id: string;
  status: string;
  categories: string[];
  issue_description: string;
  start_time: string;
  duration_minutes: number;
}

interface Profile {
  id: string;
  display_name: string;
  avatar_url: string;
  is_online: boolean;
  skills: string[];
  rating_avg: number;
}

const Session = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { checkContent } = useModeration();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [session, setSession] = useState<SessionData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [sessionTimer, setSessionTimer] = useState(0);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [pendingImages, setPendingImages] = useState<{ file: File; preview: string }[]>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [meetLink, setMeetLink] = useState("");
  const [meetDialogOpen, setMeetDialogOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (sessionId && currentUser) {
      fetchSession();
      fetchMessages();
      const unsub = subscribeToMessages();
      return unsub;
    }
  }, [sessionId, currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (session?.status === "live") {
      const interval = setInterval(() => {
        setSessionTimer((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [session?.status]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const checkAuth = async () => {
    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession) {
      navigate("/auth");
      return;
    }
    setCurrentUser(authSession.user.id);
  };

  const fetchSession = async () => {
    if (!sessionId) return;
    try {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .single();
      if (error) throw error;
      setSession(data);
      const otherUserId = data.mentor_id === currentUser ? data.mentee_id : data.mentor_id;
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", otherUserId)
        .single();
      setOtherUser(profileData);
    } catch (error: any) {
      toast({ title: "Error loading session", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!sessionId) return;
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    if (!error && data) setMessages(data);
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`messages:${sessionId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  // --- Image upload ---
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const previews = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPendingImages((prev) => [...prev, ...previews].slice(0, 4));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePendingImage = (index: number) => {
    setPendingImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadImages = async (): Promise<string[]> => {
    if (!currentUser || pendingImages.length === 0) return [];
    const urls: string[] = [];
    for (const { file } of pendingImages) {
      const ext = file.name.split(".").pop();
      const path = `${currentUser}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("chat-images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("chat-images").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  // --- Google Meet link ---
  const sendMeetLink = async () => {
    if (!meetLink.trim() || !sessionId || !currentUser) return;
    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        session_id: sessionId,
        sender_id: currentUser,
        content: `📹 Video Call Link: ${meetLink.trim()}`,
      });
      if (error) throw error;
      setMeetLink("");
      setMeetDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Failed to send link", description: error.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  // --- Send message ---
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && pendingImages.length === 0) || !sessionId || !currentUser) return;

    setSending(true);
    if (newMessage.trim()) {
      const flagged = await checkContent(newMessage.trim(), "chat message");
      if (flagged) { setSending(false); return; }
    }

    try {
      let imageUrls: string[] = [];
      if (pendingImages.length > 0) {
        setUploadingImages(true);
        imageUrls = await uploadImages();
        pendingImages.forEach((p) => URL.revokeObjectURL(p.preview));
        setPendingImages([]);
        setUploadingImages(false);
      }

      const { error } = await supabase.from("messages").insert({
        session_id: sessionId,
        sender_id: currentUser,
        content: newMessage.trim() || (imageUrls.length > 0 ? "📷 Image" : ""),
        image_urls: imageUrls.length > 0 ? imageUrls : null,
      });
      if (error) throw error;
      setNewMessage("");
    } catch (error: any) {
      toast({ title: "Failed to send message", description: error.message, variant: "destructive" });
    } finally {
      setSending(false);
      setUploadingImages(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const isMeetLink = (content: string) => {
    return content.includes("meet.google.com/") || content.startsWith("📹 Video Call Link:");
  };

  const extractUrl = (content: string) => {
    const match = content.match(/https?:\/\/[^\s]+/);
    return match ? match[0] : null;
  };

  const isMentor = session?.mentor_id === currentUser;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setLightboxImage(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          <img
            src={lightboxImage}
            alt="Full size"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="flex-1 container mx-auto px-4 py-4 flex flex-col max-h-[calc(100vh-4rem)]">
        {/* Session Header */}
        <Card className="mb-4 shrink-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={otherUser?.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {otherUser?.display_name?.split(" ").map((n) => n[0]).join("") || "U"}
                      </AvatarFallback>
                    </Avatar>
                    {otherUser?.is_online && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-background" />
                    )}
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground">
                      {otherUser?.display_name || "User"}
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {otherUser?.rating_avg && (
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-primary text-primary" />
                          {otherUser.rating_avg.toFixed(1)}
                        </span>
                      )}
                      {otherUser?.skills?.slice(0, 2).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-accent/50 px-4 py-2 rounded-lg">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-mono font-semibold text-foreground">{formatTime(sessionTimer)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Google Meet button — seller can create, buyer sees join */}
                  <Dialog open={meetDialogOpen} onOpenChange={setMeetDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon" title="Video Call">
                        <Video className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Share Video Call Link</DialogTitle>
                      </DialogHeader>
                      <p className="text-sm text-muted-foreground mb-3">
                        Create a Google Meet (or any video call) and paste the link below. It will appear as a clickable button in the chat.
                      </p>
                      <div className="flex gap-2">
                        <Input
                          value={meetLink}
                          onChange={(e) => setMeetLink(e.target.value)}
                          placeholder="https://meet.google.com/abc-defg-hij"
                          className="flex-1"
                        />
                        <Button onClick={sendMeetLink} disabled={!meetLink.trim() || sending}>
                          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                      </div>
                      <a
                        href="https://meet.google.com/new"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1 mt-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Create new Google Meet
                      </a>
                    </DialogContent>
                  </Dialog>

                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chat Messages */}
        <Card className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {session?.issue_description && (
                <div className="bg-accent/30 rounded-lg p-4 mb-6">
                  <h4 className="text-sm font-medium text-foreground mb-2">Session Topic</h4>
                  <p className="text-sm text-muted-foreground">{session.issue_description}</p>
                  {session.categories && (
                    <div className="flex gap-2 mt-2">
                      {session.categories.map((cat) => (
                        <Badge key={cat} variant="outline" className="text-xs">{cat}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {messages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => {
                  const isOwn = message.sender_id === currentUser;
                  const meetUrl = isMeetLink(message.content) ? extractUrl(message.content) : null;

                  return (
                    <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          isOwn
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-accent text-foreground rounded-bl-sm"
                        }`}
                      >
                        {/* Meet link as button */}
                        {meetUrl ? (
                          <a
                            href={meetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 font-medium text-sm ${
                              isOwn ? "text-primary-foreground hover:underline" : "text-primary hover:underline"
                            }`}
                          >
                            <Video className="h-4 w-4" />
                            Join Video Call
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{message.content === "📷 Image" ? "" : message.content}</p>
                        )}

                        {/* Image attachments */}
                        {message.image_urls && message.image_urls.length > 0 && (
                          <div className={`grid gap-2 mt-2 ${message.image_urls.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                            {message.image_urls.map((url, i) => (
                              <img
                                key={i}
                                src={url}
                                alt="Attachment"
                                className="rounded-lg max-h-48 w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => setLightboxImage(url)}
                              />
                            ))}
                          </div>
                        )}

                        <p className={`text-xs mt-1 ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {formatMessageTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Pending image previews */}
          {pendingImages.length > 0 && (
            <div className="px-4 pt-2 flex gap-2 flex-wrap">
              {pendingImages.map((img, i) => (
                <div key={i} className="relative group">
                  <img src={img.preview} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-border" />
                  <button
                    onClick={() => removePendingImage(i)}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Message Input */}
          <div className="p-4 border-t border-border">
            <form onSubmit={sendMessage} className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageSelect}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImages}
              >
                {uploadingImages ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                )}
              </Button>
              <Button type="button" variant="ghost" size="icon" className="shrink-0">
                <Code className="h-5 w-5 text-muted-foreground" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="shrink-0">
                <Smile className="h-5 w-5 text-muted-foreground" />
              </Button>

              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
                disabled={sending}
              />

              <Button
                type="submit"
                size="icon"
                disabled={(!newMessage.trim() && pendingImages.length === 0) || sending}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Session;
