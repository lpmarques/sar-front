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

import { Polygon } from "geojson";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { Container, Grid, Paper, Transition } from "@mantine/core";
import { useListState } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";
import { FarmReadData, FieldReadData, getFarm, getFieldList } from "../../apis/agroforestry";
import { QueryLoader } from "../common/QueryLoader";
import { FieldMenu, FieldsMap } from ".";

export default function ProjectDashboard() {
  const { farmId } = useParams();

  const farmQueryOptions = {
    queryKey: ['farm', farmId!],
    queryFn: getFarm
  };
  const farm = useQuery(farmQueryOptions);

  const fieldsQueryOptions = {
    queryKey: ['fieldList', farmId!],
    queryFn: getFieldList
  };
  const fields = useQuery(fieldsQueryOptions);
  
  return (
    <QueryLoader {...farmQueryOptions}>
      {farm.data && fields.data &&
      <FieldsView
        farm={farm.data}
        initialFields={fields.data}
      />}
    </QueryLoader>
  )
}

interface FieldsViewProps {
  farm: FarmReadData,
  initialFields: FieldReadData[],
}

function FieldsView({ farm, initialFields }: FieldsViewProps) {
  const [mapDrawingMode, setMapDrawingMode] = useState<boolean>(false);
  const [focusFieldIndex , setFocusFieldIndex] = useState<number | undefined>(undefined);
  const [fieldPolygons, fieldPolygonsHandlers] = useListState<Polygon>(
    initialFields.map(data => data.polygon)
  );

  const onFieldDraw = () => {
    setMapDrawingMode(true);
  };

  const onFieldCreated = (field: Polygon) => {
    setFocusFieldIndex(fieldPolygons.length);
    fieldPolygonsHandlers.append(field);
  };

  const onFieldEdited = (field: Polygon) => {
    if (focusFieldIndex !== undefined)
      fieldPolygonsHandlers.setItem(focusFieldIndex, field);
  }

  const onFieldDeleted = () => {
    if (focusFieldIndex !== undefined) {
      fieldPolygonsHandlers.remove(focusFieldIndex!);
      setFocusFieldIndex(undefined);
    }
    setMapDrawingMode(false);
  }

  const onFieldClicked = (fieldIndex: number | undefined) => {
    setFocusFieldIndex(fieldIndex);
    setMapDrawingMode(true);
  }

  const onFieldClosed = () => {
    setFocusFieldIndex(undefined);
    setMapDrawingMode(false);
  }

  const onFieldReset = () => {
    if (focusFieldIndex !== undefined)
      fieldPolygonsHandlers.setItem(focusFieldIndex, initialFields[focusFieldIndex].polygon);
  }
  
  const farmPolygon = farm.polygon ?? undefined;
  const farmLocation = !farmPolygon ? farm.location : undefined;

  return (
    <Container size="100%" mb={5} mt={-30}>
      <Grid>
        <Grid.Col span="auto">
          <Paper withBorder p={5}>
            <FieldsMap
              drawingMode={mapDrawingMode}
              fieldPolygons={fieldPolygons}
              focusFieldIndex={focusFieldIndex}
              onFieldDraw={onFieldDraw}
              onFieldCreated={onFieldCreated}
              onFieldEdited={onFieldEdited}
              onFieldDeleted={onFieldDeleted}
              onFieldClicked={onFieldClicked}
              farmLocation={farmLocation}
              farmPolygon={farmPolygon}
              style={{ height: '600px' }}
            />
          </Paper>
        </Grid.Col>
        <Transition mounted={focusFieldIndex !== undefined} transition="slide-left">
          {(transStyle) => (
            <Grid.Col span={3} style={{ ...transStyle }}>
              {focusFieldIndex !== undefined &&
              <Paper withBorder p={10} style={{ height: '100%' }}>
                <FieldMenu
                  farm={farm}
                  initialField={initialFields[focusFieldIndex]}
                  fieldPolygon={fieldPolygons[focusFieldIndex]}
                  onFieldClose={onFieldClosed}
                  onFieldDelete={onFieldDeleted}
                  onFieldReset={onFieldReset}
                />
              </Paper>}
            </Grid.Col>
          )}
        </Transition>
      </Grid>
    </Container>
  )
}
