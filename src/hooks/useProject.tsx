/*
Simulador Agroflorestal Regenera (SAR)
Copyright (C) 2026  Lucas Marques and Regenera Mata Atlântica

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses>.
*/

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useListState } from "@mantine/hooks";
import { FarmReadData, FieldReadData, FieldWriteRequestData, SitePlantFitness } from "../apis/agroforestry";
import { Optionalize } from "../utils/common";

// Field interface makes name optional to allow adding new field 
// data into the context while it is still being defined and also
// farmId optional since all fields must be tied to the same farm.
type Field = Optionalize<FieldWriteRequestData, 'name' | 'farmId'>;

interface ProjectContext {
  farm: FarmReadData;
  fields: Field[];
  plantsFitnessMap: { [k: string]: SitePlantFitness };
  initialFieldValues: FieldReadData[];
  selectedFieldIndex: number | null;
  selectField: (fieldIndex: number) => void;
  unselectField: () => void;
  setFields: (fields: React.SetStateAction<Field[]>) => void;
  addField: (field: Field) => void;
  replaceField: (field: Field) => void;
  removeField: () => void;
  resetField: () => void;
}

const ProjectContext = createContext<ProjectContext | undefined>(undefined);

export const useProject = () => {
  const projectContext = useContext(ProjectContext);
  if (!projectContext) {
    throw new Error("useProject has to be used within <ProjectProvider>");
  }
  
  return projectContext;
}

interface ProjectProviderProps {
  farm: FarmReadData;
  initialFields: FieldReadData[];
  initialSeletedFieldIndex?: number | null;
  plantsFitness?: SitePlantFitness[];
  children?: React.ReactNode;
}

export function ProjectProvider({
  children,
  farm,
  initialFields,
  initialSeletedFieldIndex = null,
  plantsFitness = [],
}: ProjectProviderProps) {
  const initialFieldValues = useMemo(() => initialFields.sort((a, b) => a.id-b.id), [initialFields]);
  const [fields, fieldsHandlers] = useListState<Field>(initialFieldValues);
  const [selectedFieldIndex, setSelectedFieldIndex] = useState<number | null>(initialSeletedFieldIndex);
  const plantsFitnessMap = useMemo(() => 
    Object.fromEntries(
      plantsFitness.map(p => [p.acceptedTaxonName, p])
    ),
    [plantsFitness.length]
  );
  
  const selectField = (fieldIndex: number) => setSelectedFieldIndex(fieldIndex);

  const unselectField = () => setSelectedFieldIndex(null);

  const setFields = (fields: React.SetStateAction<Field[]>) => {
    fieldsHandlers.setState(fields);
  };

  const addField = useCallback((field: Field) => {
      fieldsHandlers.append({ ...field, farmId: farm.id });
      selectField(fields.length);
    },
    [farm.id]
  );

  const replaceField = useCallback((field: Field) => {
      if (selectedFieldIndex === null)
        throw new Error("You can only replace a field after selecting it.")

      fieldsHandlers.setItem(selectedFieldIndex, { ...field, farmId: farm.id });
    },
    [selectedFieldIndex, farm.id]
  );

  const removeField = useCallback(() => {
      if (selectedFieldIndex === null)
        throw new Error("You can only remove a field after selecting it.")

      fieldsHandlers.remove(selectedFieldIndex);
      unselectField();
    },
    [selectedFieldIndex]
  );

  const resetField = useCallback(() => {
      if (selectedFieldIndex === null)
        throw new Error("You can only reset a field after selecting it.")

      fieldsHandlers.setItem(selectedFieldIndex, initialFields[selectedFieldIndex]);
    },
    [selectedFieldIndex]
  );

  const project = useMemo<ProjectContext>(
    () => ({
      farm,
      fields,
      plantsFitnessMap,
      selectedFieldIndex,
      initialFieldValues,
      selectField,
      unselectField,
      setFields,
      addField,
      replaceField,
      removeField,
      resetField,
    }),
    [
      farm.id,
      fields,
      plantsFitnessMap,
      selectedFieldIndex,
      initialFieldValues,
    ]
  )

  return (
    <ProjectContext value={project}>
      {children}
    </ProjectContext>
  )
}
