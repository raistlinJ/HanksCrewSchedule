export type AuxiliarySelectionForDuplication = {
  name: string;
  minYes: number;
  maxYesSelections: number | null;
  options: Array<{
    label: string;
    maxYes: number | null;
    position: number;
  }>;
};

export function duplicateAuxiliarySelection(
  selection: AuxiliarySelectionForDuplication | null,
) {
  if (!selection) {
    return undefined;
  }

  return {
    create: {
      name: selection.name,
      minYes: selection.minYes,
      maxYesSelections: selection.maxYesSelections,
      options: {
        createMany: {
          data: selection.options.map(({ label, maxYes, position }) => ({
            label,
            maxYes,
            position,
          })),
        },
      },
    },
  };
}
