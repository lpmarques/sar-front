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
import { Cropping, FarmReadData, FieldReadData, getFarm, getFieldList } from "../../apis/agroforestry";
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
      <ProjectDashboardBody
        farm={farm.data}
        initialFields={fields.data}
      />}
    </QueryLoader>
  )
}

export interface FieldGeomData {
  polygon: Polygon;
  cropping?: Cropping;
};

interface ProjectDashboardBodyProps {
  farm: FarmReadData;
  initialFields: FieldReadData[];
}

function ProjectDashboardBody({ farm, initialFields }: ProjectDashboardBodyProps) {
  const [mapDrawingMode, setMapDrawingMode] = useState<boolean>(false);
  const [focusFieldIndex, setFocusFieldIndex] = useState<number | undefined>(undefined);

  const fieldReadToGeomData = (data: FieldReadData) => ({
    ...(data.polygon && {polygon: data.polygon}),
    ...(data.cropping && {cropping: data.cropping}),
  });

  const [fields, fieldsHandlers] = useListState<FieldGeomData>(initialFields.map(fieldReadToGeomData));

  const onFieldDraw = () => {
    setMapDrawingMode(true);
  };

  const onFieldDrawn = (polygon: Polygon) => {
    setFocusFieldIndex(fields.length);
    fieldsHandlers.append({polygon});
  };

  const onFieldEdited = (field: FieldGeomData) => {
    if (focusFieldIndex !== undefined)
      fieldsHandlers.setItem(focusFieldIndex, field);
  };

  const onFieldDeleted = () => {
    if (focusFieldIndex !== undefined) {
      fieldsHandlers.remove(focusFieldIndex);
      setFocusFieldIndex(undefined);
    }
    setMapDrawingMode(false);
  };

  const onFieldClicked = (fieldIndex: number | undefined) => {
    setFocusFieldIndex(fieldIndex);
    setMapDrawingMode(true);
  };

  const onFieldClosed = () => {
    setFocusFieldIndex(undefined);
    setMapDrawingMode(false);
  };

  const onFieldReset = () => {
    if (focusFieldIndex !== undefined)
      fieldsHandlers.setItem(focusFieldIndex, fieldReadToGeomData(initialFields[focusFieldIndex]));
  };

  return (
    <Container size="100%" mb={5} mt={-30}>
      <Grid>
        <Grid.Col span="auto">
          <Paper withBorder p={5}>
            <FieldsMap
              drawingMode={mapDrawingMode}
              farm={farm}
              fields={fields}
              focusFieldIndex={focusFieldIndex}
              onFieldDraw={onFieldDraw}
              onFieldDrawn={onFieldDrawn}
              onFieldEdited={onFieldEdited}
              onFieldDeleted={onFieldDeleted}
              onFieldClicked={onFieldClicked}
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
                  fieldGeom={fields[focusFieldIndex]}
                  onFieldEdited={onFieldEdited}
                  onFieldClosed={onFieldClosed}
                  onFieldDeleted={onFieldDeleted}
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
