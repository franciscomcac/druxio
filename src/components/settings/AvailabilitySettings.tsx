import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Clock, Loader2, Save } from "lucide-react";

interface DayAvailability {
  day: number;
  dayName: string;
  isAvailable: boolean;
  startTime: string;
  endTime: string;
}

const DAYS_OF_WEEK = [
  { day: 0, name: "Sunday" },
  { day: 1, name: "Monday" },
  { day: 2, name: "Tuesday" },
  { day: 3, name: "Wednesday" },
  { day: 4, name: "Thursday" },
  { day: 5, name: "Friday" },
  { day: 6, name: "Saturday" },
];

const TIME_OPTIONS = [
  "06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30",
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30",
  "22:00", "22:30", "23:00", "23:30",
];

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
};

interface AvailabilitySettingsProps {
  userId: string;
}

const AvailabilitySettings = ({ userId }: AvailabilitySettingsProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availability, setAvailability] = useState<DayAvailability[]>(
    DAYS_OF_WEEK.map((d) => ({
      day: d.day,
      dayName: d.name,
      isAvailable: d.day >= 1 && d.day <= 5, // Mon-Fri default
      startTime: "09:00",
      endTime: "17:00",
    }))
  );

  useEffect(() => {
    fetchAvailability();
  }, [userId]);

  const fetchAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from("availability")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;

      if (data && data.length > 0) {
        setAvailability(
          DAYS_OF_WEEK.map((d) => {
            const existing = data.find((a) => a.day_of_week === d.day);
            return {
              day: d.day,
              dayName: d.name,
              isAvailable: existing?.is_available ?? (d.day >= 1 && d.day <= 5),
              startTime: existing?.start_time?.slice(0, 5) ?? "09:00",
              endTime: existing?.end_time?.slice(0, 5) ?? "17:00",
            };
          })
        );
      }
    } catch (error: any) {
      console.error("Error fetching availability:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Delete existing entries
      await supabase.from("availability").delete().eq("user_id", userId);

      // Insert new entries
      const inserts = availability.map((a) => ({
        user_id: userId,
        day_of_week: a.day,
        start_time: a.startTime,
        end_time: a.endTime,
        is_available: a.isAvailable,
      }));

      const { error } = await supabase.from("availability").insert(inserts);

      if (error) throw error;

      toast({
        title: "Availability saved",
        description: "Your availability has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving availability",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateDay = (dayIndex: number, updates: Partial<DayAvailability>) => {
    setAvailability((prev) =>
      prev.map((a) => (a.day === dayIndex ? { ...a, ...updates } : a))
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Weekly Availability
        </CardTitle>
        <CardDescription>
          Set your available hours for each day of the week
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {availability.map((day) => (
          <div
            key={day.day}
            className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg bg-accent/30"
          >
            <div className="flex items-center gap-3 min-w-[140px]">
              <Switch
                checked={day.isAvailable}
                onCheckedChange={(checked) =>
                  updateDay(day.day, { isAvailable: checked })
                }
              />
              <Label className="font-medium text-foreground">{day.dayName}</Label>
            </div>

            {day.isAvailable && (
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <Select
                  value={day.startTime}
                  onValueChange={(value) =>
                    updateDay(day.day, { startTime: value })
                  }
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time}>
                        {formatTime(time)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <span className="text-muted-foreground">to</span>

                <Select
                  value={day.endTime}
                  onValueChange={(value) =>
                    updateDay(day.day, { endTime: value })
                  }
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time}>
                        {formatTime(time)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!day.isAvailable && (
              <span className="text-sm text-muted-foreground">Unavailable</span>
            )}
          </div>
        ))}

        <Button onClick={handleSave} disabled={saving} className="gap-2 mt-4">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Availability
        </Button>
      </CardContent>
    </Card>
  );
};

export default AvailabilitySettings;
