"use client";

import { useId, useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  useComboboxAnchor,
} from "@/components/ui/combobox";

const CREATE_PREFIX = "__create_option__:";

type MultiComboboxProps = {
  closeOnValueChange?: boolean;
  label: string;
  onValueChange: (value: string[]) => void;
  options: string[];
  placeholder: string;
  value: string[];
};

export function MultiCombobox({
  closeOnValueChange = false,
  label,
  onValueChange,
  options,
  placeholder,
  value,
}: MultiComboboxProps) {
  const id = useId();
  const anchor = useComboboxAnchor();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = useMemo(() => uniqueValues(value), [value]);
  const selectedKeys = useMemo(
    () => new Set(selected.map(normalizeValue)),
    [selected],
  );
  const trimmedQuery = query.trim();

  const items = useMemo(() => {
    const available = uniqueValues([...selected, ...options]);
    const selectedItems = selected.filter((item) =>
      available.some(
        (option) => normalizeValue(option) === normalizeValue(item),
      ),
    );
    const unselectedItems = available.filter(
      (item) => !selectedKeys.has(normalizeValue(item)),
    );
    const exactMatch = available.some(
      (item) => normalizeValue(item) === normalizeValue(trimmedQuery),
    );

    return trimmedQuery && !exactMatch
      ? [
          ...selectedItems,
          ...unselectedItems,
          `${CREATE_PREFIX}${trimmedQuery}`,
        ]
      : [...selectedItems, ...unselectedItems];
  }, [options, selected, selectedKeys, trimmedQuery]);

  function handleValueChange(nextValue: string[]) {
    const createItem = nextValue.find((item) => item.startsWith(CREATE_PREFIX));

    if (createItem) {
      const customValue = createItem.slice(CREATE_PREFIX.length).trim();
      const withoutCreateItem = nextValue.filter(
        (item) => !item.startsWith(CREATE_PREFIX),
      );
      onValueChange(uniqueValues([...withoutCreateItem, customValue]));
      setQuery("");
      if (closeOnValueChange) setOpen(false);
      return;
    }

    onValueChange(uniqueValues(nextValue));
    setQuery("");
    if (closeOnValueChange) setOpen(false);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-[#6D6873]" htmlFor={id}>
        {label}
      </label>

      <Combobox
        autoHighlight
        inputValue={query}
        items={items}
        multiple
        onInputValueChange={setQuery}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setQuery("");
        }}
        onValueChange={handleValueChange}
        open={open}
        value={selected}
      >
        <ComboboxChips
          ref={anchor}
          className="min-h-12 w-full gap-2 rounded-lg border-[#D8D5DD] bg-white px-3 py-2 shadow-none focus-within:border-[#6846E8] focus-within:ring-2 focus-within:ring-[#6846E8]/15"
        >
          {selected.map((item) => (
            <ComboboxChip
              className="h-7 rounded-md bg-[#F2EEFB] pl-2 text-sm font-medium text-[#3A3340]"
              key={item}
            >
              {item}
            </ComboboxChip>
          ))}
          <ComboboxChipsInput
            id={id}
            className="h-7 min-w-24 p-0 text-base placeholder:text-muted-foreground"
            placeholder={selected.length ? "" : placeholder}
          />
          <ComboboxTrigger
            aria-label={`Open ${label.toLowerCase()} options`}
            className="ml-auto flex size-6 shrink-0 items-center justify-center"
          />
        </ComboboxChips>

        <ComboboxContent anchor={anchor}>
          <ComboboxEmpty>No options found.</ComboboxEmpty>
          <ComboboxList className="max-h-56">
            {(item) => {
              const isCreateItem = item.startsWith(CREATE_PREFIX);
              const itemValue = isCreateItem
                ? item.slice(CREATE_PREFIX.length)
                : item;
              const isSelected = selectedKeys.has(normalizeValue(itemValue));

              return (
                <ComboboxItem
                  key={item}
                  value={item}
                  className="pr-2 [&>span.absolute]:hidden"
                >
                  <Checkbox
                    aria-hidden
                    checked={isSelected}
                    className="pointer-events-none data-checked:border-[#5C3BD8] data-checked:bg-[#5C3BD8]"
                    tabIndex={-1}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {isCreateItem ? `Create "${itemValue}"` : itemValue}
                  </span>
                </ComboboxItem>
              );
            }}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

function uniqueValues(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const trimmedValue = value.trim();
    const key = normalizeValue(trimmedValue);
    if (!trimmedValue || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeValue(value: string) {
  return value.trim().toLocaleLowerCase();
}
