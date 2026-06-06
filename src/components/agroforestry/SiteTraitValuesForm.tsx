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

import Ajv from "ajv";
import AjvFormats from "ajv-formats";
import { Button, ButtonProps, Fieldset, FieldsetProps } from "@mantine/core";
import { useField, UseFieldReturnType } from "@mantine/form";
import { useQuery } from "@tanstack/react-query";
import { getSiteTraitList, SiteTraitReadData, SiteTraitValue, SiteTraitValueReadData } from "../../apis/agroforestry";
import { ClimateSummaryData, getClimateSummary, getMunicipality, getSoilSummary, MunicipalityData, SoilSummaryData } from "../../apis/geography";
import { SiteTraitValueInput } from ".";
import { QueryLoader } from "../common/QueryLoader";

export interface SiteTraitField extends SiteTraitReadData {
  field: UseFieldReturnType<SiteTraitValue | undefined>,
}

interface SiteTraitsFormProps {
  siteCenter: L.LatLng,
  siteArea?: number,
  siteMunicipalityId?: number,
  initialTraitValues?: SiteTraitValueReadData[],
  estimateTraitValues?: boolean,
  onSubmit: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>, traitFields: SiteTraitField[]) => Promise<void>,
  buttonProps?: ButtonProps,
  buttonContent: React.ReactNode,
}

export default function SiteTraitValuesForm({
    siteCenter,
    siteArea,
    siteMunicipalityId,
    initialTraitValues,
    estimateTraitValues=true,
    onSubmit,
    buttonProps,
    buttonContent,
  }: SiteTraitsFormProps
) {

  const siteTraitsQueryOptions = {
    queryKey: [ 'siteTraitList' ],
    queryFn: getSiteTraitList
  };
  const siteTraits = useQuery(siteTraitsQueryOptions);

  const municipalityQueryOptions = {
    queryKey: [
      'municipality',
      siteMunicipalityId?.toString() ?? '0',
    ],
    queryFn: getMunicipality,
    enabled: estimateTraitValues && siteMunicipalityId != undefined,
  };
  const municipality = useQuery(municipalityQueryOptions);

  const climateQueryOptions = {
    queryKey: [
      'climateSummary',
      `latlong=${siteCenter.lat},${siteCenter.lng}`,
    ],
    queryFn: getClimateSummary,
    enabled: estimateTraitValues,
  }
  const climateSummary = useQuery(climateQueryOptions);

  const soilQueryOptions = {
    queryKey: [
      'soilSummary',
      `latlong=${siteCenter.lat},${siteCenter.lng}`,
    ],
    queryFn: getSoilSummary,
    enabled: estimateTraitValues,
  }
  const soilSummary = useQuery(soilQueryOptions);

  return (
    <QueryLoader {...climateQueryOptions}>
      {siteTraits.data && (climateSummary.data && soilSummary.data || !estimateTraitValues) && 
      <SiteTraitValuesFormBody
        siteCenter={siteCenter}
        siteArea={siteArea}
        climateSummary={climateSummary.data}
        soilSummary={soilSummary.data}
        municipality={municipality.data}
        siteTraits={siteTraits.data}
        initialTraitValues={initialTraitValues}
        estimateTraitValues={estimateTraitValues}
        onSubmit={onSubmit}
        buttonProps={buttonProps}
        buttonContent={buttonContent}
      />}
    </QueryLoader>
  )
}

interface SiteTraitValuesFormBodyProps extends Omit<SiteTraitsFormProps, 'siteMunicipalityId'> {
  siteTraits: SiteTraitReadData[],
  climateSummary?: ClimateSummaryData,
  soilSummary?: SoilSummaryData,
  municipality?: MunicipalityData,
}

function SiteTraitValuesFormBody({
    siteCenter,
    siteArea,
    municipality,
    climateSummary,
    soilSummary,
    siteTraits,
    initialTraitValues,
    estimateTraitValues=true,
    onSubmit,
    buttonProps,
    buttonContent,
  }: SiteTraitValuesFormBodyProps
) {

  const ajv = AjvFormats(new Ajv());
  const validateSiteTraitValue = (trait: SiteTraitReadData, value: SiteTraitValue | undefined) => {
    if (value === undefined || value === null || 
      trait.schema.type === "string" && (value as string).trim().length === 0 ||
      trait.schema.type === "array" && (value as any[]).length === 0) {
      return trait.isNullable ? null : 'Campo obrigatório';
    }

    const textOptions = trait.textValueOptions.map(opt => opt.value);
    if (trait.schema.type === "string")
      return textOptions.includes(value as string) ? null : 'Valor inválido';
    if (trait.schema.type === "array" && trait.schema.items.type === "string")
      return (value as string[]).every((item) => textOptions.includes(item)) ? null : 'Um ou mais itens estão inválidos';
    
    const validate = ajv.compile(trait.schema);
    if (!validate(value))
      return ajv.errorsText(validate.errors);
  }
  
  const siteFiscalModules = siteArea && municipality && siteArea/municipality.fiscalModuleSizeM2;
  const normals = climateSummary?.normals;
  const droughts = climateSummary?.droughts;

  const estimatedValues: { [slug: string]: SiteTraitValue | undefined } = estimateTraitValues && normals && droughts && soilSummary ? {
    'farm-fiscal-modules': siteFiscalModules && Math.round(siteFiscalModules*100)/100,
    'latitude': siteCenter.lat,
    'altitude-m': climateSummary.elevation.elevationM,
    'annual-precipitation-mm': normals.annualPrecipitationMm ?? undefined,
    'annual-weak-drought-months': Math.round(droughts.s0DroughtMonths/droughts.periodMonths*12),
    'annual-moderate-drought-months': Math.round(droughts.s1DroughtMonths/droughts.periodMonths*12),
    'annual-severe-drought-months': Math.round(droughts.s2DroughtMonths/droughts.periodMonths*12),
    'annual-extreme-drought-months': Math.round(droughts.s3DroughtMonths/droughts.periodMonths*12),
    'annual-exceptional-drought-months': Math.round(droughts.s4DroughtMonths/droughts.periodMonths*12),
    'temperature-c-range': normals.coldestMonthTempCAvg && normals.hottestMonthTempCAvg ? [
      normals.coldestMonthTempCAvg,
      normals.hottestMonthTempCAvg
    ] : normals.coldestMonthTempCMin && normals.coldestMonthTempCMax && normals.hottestMonthTempCMin && normals.hottestMonthTempCMax ? [
      Math.round((normals.coldestMonthTempCMin+normals.coldestMonthTempCMax)/2),
      Math.round((normals.hottestMonthTempCMin+normals.hottestMonthTempCMax)/2)
    ] : undefined,
    'predominant-soil-texture': soilSummary.texture.name,
    'predominant-soil-acidity-level': soilSummary.acidity.acidityLevel?.name,
  }: {};

  const initialValues = initialTraitValues ? Object.fromEntries(initialTraitValues.map(
    (traitValue) => [traitValue.traitSlug, traitValue.value]
  )) : {};

  // appends field member to original trait object to store its value
  const traitTotraitField = (siteTrait: SiteTraitReadData): SiteTraitField => {
    return {
      ...siteTrait,
      field: useField<SiteTraitValue | undefined>({
        initialValue: estimatedValues[siteTrait.slug] ?? initialValues[siteTrait.slug],
        validate: (value) => validateSiteTraitValue(siteTrait, value),
      })
    }
  };

  // change trait list structure for easier access to objects
  const traitFieldListToObject = (traitFields: SiteTraitField[]) => {
    const sectionSlugs = [...new Set(traitFields.map(trait => trait.sectionSlug))];

    return Object.fromEntries(
      sectionSlugs.map(sectionSlug => [
        sectionSlug, // section slug key
        Object.fromEntries(
          traitFields.filter(trait => trait.sectionSlug === sectionSlug).map(trait => [
            trait.slug, // nested trait slug key
            trait
          ])
        )
      ])
    );
  };

  const orderedTraits = siteTraits.sort((a, b) => a.position-b.position);
  const traitFields = orderedTraits.map(siteTrait => traitTotraitField(siteTrait));
  const sectionedTraitFields = traitFieldListToObject(traitFields);

  const sections = Object.fromEntries(orderedTraits.map(siteTrait => [siteTrait.sectionSlug, siteTrait.sectionName]));
  
  const otherSections = Object.keys(sections).filter(sectionSlug => !["land", "climate", "soil"].includes(sectionSlug));
  const otherFieldSets = otherSections.map(sectionSlug => (
    <TraitFieldset
      legend={sections[sectionSlug]}
      traitFields={sectionedTraitFields[sectionSlug]}
      mb={10}
      />
  ));

  return (
    <>
      <TraitFieldset
        legend={sections["land"]}
        traitFields={sectionedTraitFields["land"]}
        mb={10}
        />
      <TraitFieldset
        legend={sections["climate"]}
        traitFields={sectionedTraitFields["climate"]}
        mb={10}
        />
      <TraitFieldset
        legend={sections["soil"]}
        traitFields={sectionedTraitFields["soil"]}
        mb={10}
        />
      {otherFieldSets}
      <Button
        fullWidth
        mt="xl"
        radius="md"
        color="teal"
        onClick={(e) => onSubmit(e, traitFields)}
        {...buttonProps}
        >
        {buttonContent}
      </Button>
    </>
  )
}

interface TraitFieldsetProps extends Omit<FieldsetProps, 'children'> {
  traitFields: { [traitSlug: string]: SiteTraitField },
}

function TraitFieldset({ traitFields, ...fieldsetProps }: TraitFieldsetProps) {
  const fields = Object.entries(traitFields).map(([slug, traitField]) => (
    <SiteTraitValueInput mb={10} key={slug} trait={traitField} field={traitField.field}/>
  ))
  
  return (
    <Fieldset {...fieldsetProps}>
      {fields}
    </Fieldset>
  )
}
