import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Plus, Trash2, Image, Loader2 } from "lucide-react";

interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  created_at: string;
}

interface Props {
  userId: string;
  editable?: boolean;
}

const PortfolioSection = ({ userId, editable = false }: Props) => {
  const { toast } = useToast();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", link_url: "" });

  useEffect(() => {
    fetchItems();
  }, [userId]);

  const fetchItems = async () => {
    const { data } = await supabase
      .from("portfolio_items")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("portfolio_items").insert({
      user_id: userId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      link_url: form.link_url.trim() || null,
    });
    if (error) {
      toast({ title: "Error adding item", description: error.message, variant: "destructive" });
    } else {
      setForm({ title: "", description: "", link_url: "" });
      setShowForm(false);
      fetchItems();
      toast({ title: "Portfolio item added" });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("portfolio_items").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
    toast({ title: "Item removed" });
  };

  if (loading) return null;
  if (!editable && items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Image className="h-5 w-5" /> Portfolio
          </CardTitle>
          {editable && !showForm && (
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowForm(true)}>
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && editable && (
          <div className="space-y-3 p-4 rounded-lg border border-border bg-accent/20">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                placeholder="e.g. Valorant Rank Boost"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description of this work..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="min-h-20"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Link (optional)</Label>
              <Input
                placeholder="https://..."
                value={form.link_url}
                onChange={e => setForm({ ...form, link_url: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={saving || !form.title.trim()} className="gap-1">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {items.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground text-center py-4">No portfolio items yet</p>
        )}

        {items.map(item => (
          <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-foreground text-sm">{item.title}</h4>
                {item.link_url && (
                  <a href={item.link_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
              {item.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
              )}
            </div>
            {editable && (
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(item.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default PortfolioSection;
