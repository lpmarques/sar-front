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

import { createContext, useContext, useMemo, useState } from "react";
import { useListState, useToggle } from "@mantine/hooks";
import { FarmReadData, FieldReadData, FieldWriteRequestData } from "../apis/agroforestry";

// Field interface makes name optional to allow adding new field 
// data into the context while it is still being defined and also
// farmId optional since all fields must be tied to the same farm.
interface Field extends Omit<FieldWriteRequestData, 'name' | 'farmId'> {
  farmId?: number,
  name?: string,
}

interface ProjectContext {
  farm: FarmReadData;
  fields: Field[];
  initialFieldValues: FieldReadData[];
  selectedFieldIndex: number | null;
  inputsEnabled: boolean;
  selectField: (fieldIndex: number) => void;
  unselectField: () => void;
  setFields: (fields: React.SetStateAction<Field[]>) => void;
  addField: (field: Field) => void;
  replaceField: (field: Field) => void;
  removeField: () => void;
  resetField: () => void;
  enableInputs: () => void;
  disableInputs: () => void;
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
  children?: React.ReactNode;
}

export function ProjectProvider({children, farm, initialFields, initialSeletedFieldIndex}: ProjectProviderProps) {
  const initialFieldValues = useMemo(() => initialFields.sort((a, b) => a.id-b.id), [initialFields]);
  const [fields, fieldsHandlers] = useListState<Field>(initialFieldValues);
  const [inputsEnabled, setInputsEnabled] = useState<boolean>(true);
  const [selectedFieldIndex, setSelectedFieldIndex] = useState<number | null>(initialSeletedFieldIndex ?? null);
  
  const selectField = (fieldIndex: number) => setSelectedFieldIndex(fieldIndex);

  const unselectField = () => setSelectedFieldIndex(null);

  const setFields = (fields: React.SetStateAction<Field[]>) => {
    fieldsHandlers.setState(fields);
  };

  const addField = (field: Field) => {
    fieldsHandlers.append({ ...field, farmId: farm.id });
    selectField(fields.length);
  };

  const replaceField = (field: Field) => {
    if (selectedFieldIndex === null)
      throw new Error("You can only replace a field after selecting it.")
    fieldsHandlers.setItem(selectedFieldIndex, { ...field, farmId: farm.id });
  };

  const removeField = () => {
    if (selectedFieldIndex === null)
      throw new Error("You can only remove a field after selecting it.")
    fieldsHandlers.remove(selectedFieldIndex);
    unselectField();
  };

  const resetField = () => {
    if (selectedFieldIndex === null)
      throw new Error("You can only reset a field after selecting it.")

    console.log(`resetando ${fields[selectedFieldIndex].name} com dados do ${initialFields[selectedFieldIndex].name}`);
    fieldsHandlers.setItem(selectedFieldIndex, initialFields[selectedFieldIndex]);
  }

  const enableInputs = () => setInputsEnabled(true);

  const disableInputs = () => setInputsEnabled(false);

  const project = useMemo<ProjectContext>(
    () => ({
      farm,
      fields,
      selectedFieldIndex,
      initialFieldValues,
      inputsEnabled,
      selectField,
      unselectField,
      setFields,
      addField,
      replaceField,
      removeField,
      resetField,
      enableInputs,
      disableInputs,
    }),
    [
      farm.id,
      fields,
      selectedFieldIndex,
      initialFieldValues,
      inputsEnabled,
    ]
  )

  return (
    <ProjectContext value={project}>
      {children}
    </ProjectContext>
  )
}
