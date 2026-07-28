import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  searchAddresses,
  type AddressSuggestion,
} from "@workspace/api-client-react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (streetAddress: string, city: string, postalCode: string) => void;
  placeholder?: string;
  className?: string;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "123 Main St",
  className,
}: Props) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim();
    if (trimmed.length < 4) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        // Search goes through our own API, which caches results and respects
        // the upstream provider's rate limits.
        const results = await searchAddresses(
          { q: trimmed },
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        setSuggestions(results);
        setOpen(results.length > 0);
        setSelectedIndex(-1);
      } catch {
        // silently ignore network errors — plain text input still works
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 500);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (suggestion: AddressSuggestion) => {
    onChange(suggestion.streetAddress);
    onSelect(suggestion.streetAddress, suggestion.city, suggestion.postalCode);
    setOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className={cn("h-12 pr-10", className)}
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <MapPin className="w-4 h-4" />
          )}
        </div>
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-card border rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent input blur before click fires
                  handleSelect(s);
                }}
                className={cn(
                  "w-full text-left px-4 py-3 text-sm flex gap-3 items-start transition-colors hover:bg-primary/5",
                  i === selectedIndex && "bg-primary/10"
                )}
              >
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                <span>
                  <span className="font-semibold">{s.streetAddress}</span>
                  {s.city && (
                    <span className="text-muted-foreground">
                      {" "}
                      — {s.city}{s.postalCode ? `, ${s.postalCode}` : ""}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
