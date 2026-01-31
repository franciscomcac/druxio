import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const TIMEZONES = [
  { value: "UTC+0", offset: "UTC+0", label: "London, Dublin, Lisbon" },
  { value: "UTC+1", offset: "UTC+1", label: "Paris, Berlin, Amsterdam, Rome" },
  { value: "UTC+2", offset: "UTC+2", label: "Cairo, Athens, Helsinki, Istanbul" },
  { value: "UTC+3", offset: "UTC+3", label: "Moscow, Nairobi, Baghdad" },
  { value: "UTC+3:30", offset: "UTC+3:30", label: "Tehran" },
  { value: "UTC+4", offset: "UTC+4", label: "Dubai, Baku, Tbilisi" },
  { value: "UTC+4:30", offset: "UTC+4:30", label: "Kabul" },
  { value: "UTC+5", offset: "UTC+5", label: "Karachi, Tashkent" },
  { value: "UTC+5:30", offset: "UTC+5:30", label: "Mumbai, New Delhi, Kolkata" },
  { value: "UTC+5:45", offset: "UTC+5:45", label: "Kathmandu" },
  { value: "UTC+6", offset: "UTC+6", label: "Dhaka, Almaty" },
  { value: "UTC+6:30", offset: "UTC+6:30", label: "Yangon" },
  { value: "UTC+7", offset: "UTC+7", label: "Bangkok, Jakarta, Ho Chi Minh" },
  { value: "UTC+8", offset: "UTC+8", label: "Singapore, Hong Kong, Shanghai, Perth" },
  { value: "UTC+9", offset: "UTC+9", label: "Tokyo, Seoul" },
  { value: "UTC+9:30", offset: "UTC+9:30", label: "Adelaide, Darwin" },
  { value: "UTC+10", offset: "UTC+10", label: "Sydney, Melbourne, Brisbane" },
  { value: "UTC+11", offset: "UTC+11", label: "Solomon Islands, New Caledonia" },
  { value: "UTC+12", offset: "UTC+12", label: "Auckland, Fiji" },
  { value: "UTC+13", offset: "UTC+13", label: "Tonga, Samoa" },
  { value: "UTC-12", offset: "UTC-12", label: "Baker Island" },
  { value: "UTC-11", offset: "UTC-11", label: "American Samoa" },
  { value: "UTC-10", offset: "UTC-10", label: "Hawaii, Honolulu" },
  { value: "UTC-9", offset: "UTC-9", label: "Alaska, Anchorage" },
  { value: "UTC-8", offset: "UTC-8", label: "Los Angeles, Vancouver, Seattle" },
  { value: "UTC-7", offset: "UTC-7", label: "Denver, Phoenix, Calgary" },
  { value: "UTC-6", offset: "UTC-6", label: "Chicago, Mexico City, Houston" },
  { value: "UTC-5", offset: "UTC-5", label: "New York, Toronto, Miami, Bogota" },
  { value: "UTC-4", offset: "UTC-4", label: "Santiago, Caracas, Halifax" },
  { value: "UTC-3:30", offset: "UTC-3:30", label: "St. John's" },
  { value: "UTC-3", offset: "UTC-3", label: "São Paulo, Buenos Aires, Rio" },
  { value: "UTC-2", offset: "UTC-2", label: "South Georgia" },
  { value: "UTC-1", offset: "UTC-1", label: "Azores, Cape Verde" },
];

// Sort by offset value for logical ordering
const SORTED_TIMEZONES = TIMEZONES.sort((a, b) => {
  const parseOffset = (offset: string) => {
    const match = offset.match(/UTC([+-])(\d+)(?::(\d+))?/);
    if (!match) return 0;
    const sign = match[1] === '+' ? 1 : -1;
    const hours = parseInt(match[2]);
    const minutes = match[3] ? parseInt(match[3]) : 0;
    return sign * (hours * 60 + minutes);
  };
  return parseOffset(a.offset) - parseOffset(b.offset);
});

interface TimezoneSelectProps {
  value: string;
  onChange: (value: string) => void;
}

const TimezoneSelect = ({ value, onChange }: TimezoneSelectProps) => {
  // Find the display value for current selection
  const currentTimezone = SORTED_TIMEZONES.find((tz) => tz.value === value);
  
  return (
    <div className="space-y-2">
      <Label htmlFor="timezone">Timezone</Label>
      <Select value={value || "UTC+0"} onValueChange={onChange}>
        <SelectTrigger id="timezone" className="w-full">
          <SelectValue>
            {currentTimezone?.offset || value || "UTC+0"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {SORTED_TIMEZONES.map((tz) => (
            <SelectItem key={tz.value} value={tz.value}>
              <span className="font-medium">{tz.offset}</span>
              <span className="text-muted-foreground ml-2">— {tz.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default TimezoneSelect;
