import { LatLng } from "leaflet";
import { Button, ButtonProps, Select } from "@mantine/core";
import { UseFormReturnType } from "@mantine/form";
import { useQuery } from "@tanstack/react-query";
import { FarmWriteRequestData } from "../../apis/agroforestry";
import { geoDataToOptions, getLandSummary, getMunicipalityList } from "../../apis/geography";
import { QueryLoader } from "../common/QueryLoader";

interface FarmLandFormProps {
  farmCenter: LatLng,
  farmForm: UseFormReturnType<FarmWriteRequestData>,
  onSubmit: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => Promise<void>,
  buttonProps?: ButtonProps,
  buttonContent: React.ReactNode,
}

export default function FarmLandForm({ farmCenter, farmForm, onSubmit, buttonProps, buttonContent }: FarmLandFormProps) {

  const landQueryOptions = {
    queryKey: [
      'landSummary',
      `latlong=${farmCenter?.lat},${farmCenter?.lng}`,
    ],
    queryFn: getLandSummary,
  };
  const landSummary = useQuery(landQueryOptions);

  const municipalitiesQueryOptions = {
    queryKey: [
      'municipalityList',
      landSummary.data?.state?.id.toString() ?? '0',
    ],
    queryFn: getMunicipalityList,
    enabled: landSummary.data?.state != undefined,
  };
  const municipalities = useQuery(municipalitiesQueryOptions);
  const municipalityOptions = municipalities.data ? geoDataToOptions(municipalities.data) : [];

  return (
    <QueryLoader {...landQueryOptions}>
      {landSummary.data && <>
      <Select
        label="País"
        mt={15}
        disabled
        data={[{
            value: landSummary.data.country?.id.toString(),
            label: landSummary.data.country?.name
        }]}
        value={landSummary.data.country?.id.toString()}
      />
      {landSummary.data.state.id &&
      <Select
        label="Estado"
        mt={15}
        disabled
        data={[{
            value: landSummary.data.state?.id.toString(),
            label: landSummary.data.state?.code
        }]}
        value={landSummary.data.state?.id.toString()}
      />}
      {municipalityOptions &&
      <Select
        key={farmForm.key('municipalityId')}
        label="Município"
        mt={15}
        clearable
        searchable
        withScrollArea={false}
        data={municipalityOptions}
        defaultValue={farmForm.getValues()['municipalityId']?.toString()}
        onChange={(value) => farmForm.setFieldValue('municipalityId', Number(value))}
        // setting custom props is needed to avoid type conflict between field (number) and select data values (string)
        // {...farmForm.getInputProps('municipalityId')}
      />}
      {landSummary.data.biome.id &&
      <Select
        label="Bioma"
        mt={15}
        disabled
        data={[{
            value: landSummary.data.biome?.id.toString(),
            label: landSummary.data.biome?.name
        }]}
        value={landSummary.data.biome?.id.toString()}
      />}
      {landSummary.data.vegetationType.id &&
      <Select
        label="Vegetação Natural"
        mt={15}
        disabled
        data={[{
            value: landSummary.data.vegetationType?.id.toString(),
            label: landSummary.data.vegetationType?.name
        }]}
        value={landSummary.data.vegetationType?.id.toString()}
      />}
      <Button
        fullWidth
        mt="xl"
        radius="md"
        color="teal"
        onClick={onSubmit}
        {...buttonProps}
      >
        {buttonContent}
      </Button>
      </>}
    </QueryLoader>
  )
}