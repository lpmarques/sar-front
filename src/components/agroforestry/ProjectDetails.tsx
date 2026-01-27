import { Polygon } from "geojson";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { Container, Grid, Paper, Transition } from "@mantine/core";
import { useListState } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";
import { FarmReadData, FieldReadData, getFarm, getFieldList } from "../../apis/agroforestry";
import { QueryLoader } from "../common/QueryLoader";
import { FieldMenu, FieldsMap } from ".";

export default function ProjectDetails() {
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
        fields={fields.data}
      />}
    </QueryLoader>
  )
}

interface FieldsViewProps {
  farm: FarmReadData,
  fields: FieldReadData[],
}

function FieldsView({ farm, fields }: FieldsViewProps) {
  const [mapDrawingMode, setMapDrawingMode] = useState<boolean>(false);
  const [focusFieldIndex , setFocusFieldIndex] = useState<number | undefined>(undefined);
  const [fieldPolygons, fieldPolygonsHandlers] = useListState<Polygon>(
    fields.map(data => data.polygon)
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
                  field={fields[focusFieldIndex]}
                  fieldPolygon={fieldPolygons[focusFieldIndex]}
                  onFieldClose={onFieldClosed}
                  onFieldDelete={onFieldDeleted}
                />
              </Paper>}
            </Grid.Col>
          )}
        </Transition>
      </Grid>
    </Container>
  )
}
