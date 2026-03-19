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

import { ComponentType } from 'react';
import { TableTdProps } from '@mantine/core';
import {
  proposeNaturalOccurrenceRegion,
  proposePopularName,
  proposeTaxon,
  rejectNaturalOccurrenceRegion,
  rejectPopularName,
  rejectTaxon,
  NaturalOccurrenceRegionReadData,
  NaturalOccurrenceRegionWriteRequestData,
  PopularNameReadData,
  PopularNameWriteRequestData,
  TaxonReadData,
  TaxonWriteRequestData,
  acceptTaxon,
  acceptPopularName,
  acceptNaturalOccurrenceRegion,
} from '../../apis/catalog';
import { GenericResponse, QueryOptions } from '../../apis/common';
import { ContentReadData, ContentWriteRequestData, ContentWriteResponseData } from '../../apis/core';
import { FormErrors, UseFormReturnType } from '@mantine/form';
import {
  buildTaxonListQueryOptions,
  buildTaxonWriteRequestData,
  TaxonFormRow,
  taxonFormKeys,
  TaxonHeader,
  TaxonRow,
  validateTaxonFormsDiff,
  validateTaxonFormToReadDataDiff,
  TaxonSectionInfo,
} from './TaxonomySection';
import {
  buildPopularNameListQueryOptions,
  buildPopularNameWriteRequestData,
  PopularNameFormRow,
  popularNameFormKeys,
  PopularNameHeader,
  PopularNameRow,
  validatePopularNameFormToReadDataDiff,
  PopularNameSectionInfo,
} from './PopularNamesSection';
import {
  buildNaturalOccurrenceRegionListQueryOptions,
  buildNaturalOccurrenceRegionWriteRequestData,
  NaturalOccurrenceRegionFormRow,
  naturalOccurrenceRegionFormKeys,
  NaturalOccurrenceRegionHeader,
  NaturalOccurrenceRegionRow,
  sortNaturalOccurrenceRegions,
  validateNaturalOccurrenceRegionFormToReadDataDiff,
  NaturalOccurrenceRegionSectionInfo,
} from './NaturalOccurrenceRegionsSection';

export type SectionSlug = 'popular-names' | 'taxonomy' | 'natural-occurrence-regions';

export type ContentForm<WriteT> = Omit<WriteT, keyof ContentWriteRequestData | 'plantId'>;

export interface ContentDisplayRowProps<ReadT extends ContentReadData> extends TableTdProps {
  data: ReadT,
}

export interface ContentFormRowProps<ReadT extends ContentReadData, WriteT extends ContentWriteRequestData> {
  forms: UseFormReturnType<ContentForm<WriteT>>[],
  setForms: React.Dispatch<React.SetStateAction<UseFormReturnType<ContentForm<WriteT>>[]>>,
  itemsQueryOptions: QueryOptions<ReadT[]>,
}

export interface BuildWriteRequestDataProps<WriteT> {
  formValues: ContentForm<WriteT>,
  plantId: number,
  sourceId: number,
  contentProposerComment?: string,
}

export interface SectionConfig<ReadT extends ContentReadData, WriteT extends ContentWriteRequestData> {
  sectionName: string,
  SectionInfo?: ComponentType,
  buildQueryOptions: (plantId: number) => QueryOptions<ReadT[]>,
  sortReadData?: (a: ReadT, b: ReadT) => number,
  Header: ComponentType,
  DisplayRow: ComponentType<ContentDisplayRowProps<ReadT>>,
  FormRow: ComponentType<ContentFormRowProps<ReadT, WriteT>>,
  formKeys: (keyof ContentForm<WriteT>)[],
  validateFormsDiff?: (a: ContentForm<WriteT>, b: ContentForm<WriteT>, errMsg: string) => FormErrors | undefined,
  validateFormToReadDataDiff: (formValues: ContentForm<WriteT>, readData: ReadT, errMsg: string) => FormErrors | undefined,
  buildWriteRequestData: (props: BuildWriteRequestDataProps<WriteT>) => WriteT,
  proposeMutationFunction: (data: WriteT) => Promise<ContentWriteResponseData>,
  acceptMutationFunction: (id: number) => Promise<GenericResponse>,
  rejectMutationFunction: (id: number) => Promise<GenericResponse>,
}

// TODO: convert into a hook
export const getSectionConfig = (sectionSlug: SectionSlug):
  SectionConfig<TaxonReadData, TaxonWriteRequestData> |
  SectionConfig<PopularNameReadData, PopularNameWriteRequestData> |
  SectionConfig<NaturalOccurrenceRegionReadData, NaturalOccurrenceRegionWriteRequestData> |
  undefined => {
  switch (sectionSlug) {
    case 'taxonomy':
      return {
        sectionName: 'Taxonomia',
        SectionInfo: TaxonSectionInfo,
        buildQueryOptions: buildTaxonListQueryOptions,
        Header: TaxonHeader,
        DisplayRow: TaxonRow,
        FormRow: TaxonFormRow,
        formKeys: taxonFormKeys,
        validateFormsDiff: validateTaxonFormsDiff,
        validateFormToReadDataDiff: validateTaxonFormToReadDataDiff,
        buildWriteRequestData: buildTaxonWriteRequestData,
        proposeMutationFunction: proposeTaxon,
        acceptMutationFunction: acceptTaxon,
        rejectMutationFunction: rejectTaxon,
      } as SectionConfig<TaxonReadData, TaxonWriteRequestData>;
    case 'popular-names':
      return {
        sectionName: 'Nomes Populares',
        SectionInfo: PopularNameSectionInfo,
        buildQueryOptions: buildPopularNameListQueryOptions,
        Header: PopularNameHeader,
        DisplayRow: PopularNameRow,
        FormRow: PopularNameFormRow,
        formKeys: popularNameFormKeys,
        validateFormToReadDataDiff: validatePopularNameFormToReadDataDiff,
        buildWriteRequestData: buildPopularNameWriteRequestData,
        proposeMutationFunction: proposePopularName,
        acceptMutationFunction: acceptPopularName,
        rejectMutationFunction: rejectPopularName,
      } as SectionConfig<PopularNameReadData, PopularNameWriteRequestData>;
    case 'natural-occurrence-regions':
      return {
        sectionName: 'Regiões de Ocorrência Natural',
        SectionInfo: NaturalOccurrenceRegionSectionInfo,
        buildQueryOptions: buildNaturalOccurrenceRegionListQueryOptions,
        sortReadData: sortNaturalOccurrenceRegions,
        Header: NaturalOccurrenceRegionHeader,
        DisplayRow: NaturalOccurrenceRegionRow,
        FormRow: NaturalOccurrenceRegionFormRow,
        formKeys: naturalOccurrenceRegionFormKeys,
        validateFormToReadDataDiff: validateNaturalOccurrenceRegionFormToReadDataDiff,
        buildWriteRequestData: buildNaturalOccurrenceRegionWriteRequestData,
        proposeMutationFunction: proposeNaturalOccurrenceRegion,
        acceptMutationFunction: acceptNaturalOccurrenceRegion,
        rejectMutationFunction: rejectNaturalOccurrenceRegion,
      } as SectionConfig<NaturalOccurrenceRegionReadData, NaturalOccurrenceRegionWriteRequestData>;
  }
}
