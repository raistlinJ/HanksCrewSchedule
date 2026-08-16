"use client";

import { Button } from "@rallly/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rallly/ui/card";
import { Input } from "@rallly/ui/input";
import { Label } from "@rallly/ui/label";
import { Switch } from "@rallly/ui/switch";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useFormContext } from "react-hook-form";
import type { NewEventData } from "./types";

export function AuxiliarySelectionForm() {
  const form = useFormContext<NewEventData>();
  const selection = form.watch("auxiliarySelection");
  const options = selection?.options ?? [];
  const limitSelections = selection?.limitSelections ?? false;
  const maxYesSelections = selection?.maxYesSelections ?? 1;

  const updateSelection = (
    update: Partial<NewEventData["auxiliarySelection"]>,
  ) => {
    const currentSelection = selection ?? {
      enabled: false,
      name: "",
      requireMinimum: false,
      minYes: 0,
      limitSelections: false,
      maxYesSelections: 1,
      options: [],
    };
    form.setValue(
      "auxiliarySelection",
      {
        ...currentSelection,
        ...update,
      },
      { shouldDirty: true },
    );
  };

  const updateOption = (
    index: number,
    update: Partial<(typeof options)[number]>,
  ) => {
    const nextOptions = [...options];
    nextOptions[index] = { ...options[index], ...update };
    updateSelection({ options: nextOptions });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Auxiliary selection</CardTitle>
          <CardDescription>
            Add a named set of extra choices to this poll.
          </CardDescription>
        </div>
        <Switch
          aria-label="Enable auxiliary selection"
          checked={selection?.enabled ?? false}
          onCheckedChange={(enabled) => {
            updateSelection({
              enabled,
              options:
                enabled && options.length === 0
                  ? [{ label: "", maxYes: null }]
                  : options,
            });
          }}
        />
      </CardHeader>
      {selection?.enabled ? (
        <CardContent className="space-y-5 border-t pt-4">
          <div className="space-y-2">
            <Label htmlFor="auxiliary-selection-name">Selection name</Label>
            <Input
              id="auxiliary-selection-name"
              required
              maxLength={100}
              placeholder="For example: Roles or Equipment"
              value={selection.name}
              onChange={(event) => {
                updateSelection({ name: event.target.value });
              }}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-medium text-sm">Choices</h3>
                <p className="text-muted-foreground text-xs">
                  Each choice starts as If needed for new responses.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  updateSelection({
                    options: [...options, { label: "", maxYes: null }],
                  });
                }}
              >
                <PlusIcon />
                Add choice
              </Button>
            </div>

            <div className="divide-y rounded-xl border">
              {options.map((option, index) => {
                const maxEnabled = option.maxYes !== null;
                return (
                  <div
                    key={option.optionId ?? `new-${index}`}
                    className="flex flex-wrap items-center gap-3 p-3"
                  >
                    <Input
                      required
                      maxLength={100}
                      aria-label={`Auxiliary choice ${index + 1}`}
                      className="min-w-48 flex-1"
                      placeholder={`Choice ${index + 1}`}
                      value={option.label}
                      onChange={(event) => {
                        updateOption(index, { label: event.target.value });
                      }}
                    />
                    <Label className="flex items-center gap-2">
                      <Switch
                        checked={maxEnabled}
                        onCheckedChange={(checked) => {
                          updateOption(index, {
                            maxYes: checked ? (option.maxYes ?? 1) : null,
                          });
                        }}
                      />
                      Limit selections
                    </Label>
                    {maxEnabled ? (
                      <Input
                        aria-label={`Maximum Yes responses for ${option.label || `choice ${index + 1}`}`}
                        className="w-20"
                        min={1}
                        max={100000}
                        step={1}
                        type="number"
                        value={option.maxYes ?? 1}
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          updateOption(index, {
                            maxYes: Number.isInteger(value)
                              ? Math.min(Math.max(value, 1), 100000)
                              : 1,
                          });
                        }}
                      />
                    ) : null}
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      disabled={options.length === 1}
                      aria-label={`Remove ${option.label || `choice ${index + 1}`}`}
                      onClick={() => {
                        const nextOptions = options.filter(
                          (_, optionIndex) => optionIndex !== index,
                        );
                        updateSelection({
                          options: nextOptions,
                          requireMinimum:
                            nextOptions.length > 0
                              ? selection.requireMinimum
                              : false,
                          minYes:
                            nextOptions.length > 0
                              ? Math.min(
                                  Math.max(selection.minYes, 1),
                                  nextOptions.length,
                                )
                              : 0,
                          limitSelections:
                            nextOptions.length > 0 ? limitSelections : false,
                          maxYesSelections:
                            nextOptions.length > 0
                              ? Math.min(
                                  Math.max(maxYesSelections, 1),
                                  nextOptions.length,
                                )
                              : 1,
                        });
                      }}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-3">
            <div>
              <Label htmlFor="require-auxiliary-minimum">
                Require Yes selections
              </Label>
              <p className="text-muted-foreground text-xs">
                Require participants to answer Yes to at least this many
                choices.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {selection.requireMinimum ? (
                <Input
                  aria-label="Minimum required Yes selections"
                  className="w-20"
                  min={1}
                  max={
                    limitSelections
                      ? maxYesSelections
                      : Math.max(options.length, 1)
                  }
                  step={1}
                  type="number"
                  value={Math.min(
                    Math.max(selection.minYes, 1),
                    limitSelections
                      ? maxYesSelections
                      : Math.max(options.length, 1),
                  )}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    updateSelection({
                      minYes: Number.isInteger(value)
                        ? Math.min(
                            Math.max(value, 1),
                            limitSelections
                              ? maxYesSelections
                              : Math.max(options.length, 1),
                          )
                        : 1,
                    });
                  }}
                />
              ) : null}
              <Switch
                id="require-auxiliary-minimum"
                disabled={options.length === 0}
                checked={selection.requireMinimum}
                onCheckedChange={(requireMinimum) => {
                  updateSelection({
                    requireMinimum,
                    minYes: requireMinimum
                      ? Math.min(
                          Math.max(selection.minYes, 1),
                          limitSelections
                            ? maxYesSelections
                            : Math.max(options.length, 1),
                        )
                      : 0,
                  });
                }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-3">
            <div>
              <Label htmlFor="limit-auxiliary-selections">
                Limit selections per participant
              </Label>
              <p className="text-muted-foreground text-xs">
                Limit how many auxiliary choices one participant can answer Yes
                to.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {limitSelections ? (
                <Input
                  aria-label="Maximum auxiliary selections per participant"
                  className="w-20"
                  min={selection.requireMinimum ? selection.minYes : 1}
                  max={Math.max(options.length, 1)}
                  step={1}
                  type="number"
                  value={Math.min(
                    Math.max(
                      maxYesSelections,
                      selection.requireMinimum ? selection.minYes : 1,
                    ),
                    Math.max(options.length, 1),
                  )}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    const minimum = selection.requireMinimum
                      ? selection.minYes
                      : 1;
                    updateSelection({
                      maxYesSelections: Number.isInteger(value)
                        ? Math.min(
                            Math.max(value, minimum),
                            Math.max(options.length, 1),
                          )
                        : minimum,
                    });
                  }}
                />
              ) : null}
              <Switch
                id="limit-auxiliary-selections"
                disabled={options.length === 0}
                checked={limitSelections}
                onCheckedChange={(limitSelections) => {
                  updateSelection({
                    limitSelections,
                    maxYesSelections: limitSelections
                      ? Math.min(
                          Math.max(
                            maxYesSelections,
                            selection.requireMinimum ? selection.minYes : 1,
                          ),
                          Math.max(options.length, 1),
                        )
                      : maxYesSelections,
                  });
                }}
              />
            </div>
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}
