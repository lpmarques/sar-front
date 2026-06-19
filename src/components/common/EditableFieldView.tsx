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

import { useState } from "react";
import { Button, Group, TextInput } from "@mantine/core";
import { UseFormReturnType } from "@mantine/form";
import { IconPencil } from "@tabler/icons-react";
import { FieldWriteRequestData } from "../../apis/agroforestry";
import FieldView from "./FieldView";

interface EditableFieldViewProps {
  editing: boolean,
  form: UseFormReturnType<FieldWriteRequestData>,
  key: 'name',
  label: string,
}

export default function EditableFieldView({ editing, form, key, label }: EditableFieldViewProps) {
  const [editMode, setEditMode] = useState<boolean>(editing);

  const handleEditButtonClick = () => {
    setEditMode((editMode) => !editMode);
  };
  
  return (
    <>
    {editMode ?
    <TextInput
      label={label}
      pb={10}
      {...form.getInputProps(key)}
    /> :
    <Group>
      <FieldView label={label}>
        {form.getValues()[key]}
      </FieldView>
      <Button variant="default" size="compact-xs" color="dimmed" onClick={() => handleEditButtonClick()}>
        <IconPencil size={20} />
      </Button>
    </Group>}
    </>
  )
}
