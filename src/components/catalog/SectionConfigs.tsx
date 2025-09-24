import { ComponentType } from 'react';
import { TableTdProps } from '@mantine/core';
import {
  createNaturalOccurrenceRegion,
  createPopularName,
  createTaxon,
  deleteNaturalOccurrenceRegion,
  deletePopularName,
  deleteTaxon,
  NaturalOccurrenceRegionReadData,
  NaturalOccurrenceRegionWriteRequestData,
  PopularNameReadData,
  PopularNameWriteRequestData,
  TaxonReadData,
  TaxonWriteRequestData,
} from '../../apis/catalog';
import { GenericResponse, QueryOptions } from '../../apis/common';
import { ContentReadData, ContentWriteRequestData, ContentWriteResponseData } from '../../apis/core';
import { FormErrors, UseFormReturnType } from '@mantine/form';
import {
  buildTaxonListQueryOptions,
  buildTaxonWriteRequestData,
  TaxonFormRow,
  taxonFormUniqueKey,
  TaxonHeader,
  TaxonRow,
  validateTaxonFormToReadDataDiff,
} from './TaxonomySection';
import {
  buildPopularNameListQueryOptions,
  buildPopularNameWriteRequestData,
  PopularNameFormRow,
  popularNameFormUniqueKey,
  PopularNameHeader,
  PopularNameRow,
  validatePopularNameFormToReadDataDiff,
} from './PopularNamesSection';
import {
  buildNaturalOccurrenceRegionListQueryOptions,
  buildNaturalOccurrenceRegionWriteRequestData,
  NaturalOccurrenceRegionFormRow,
  naturalOccurrenceRegionFormUniqueKey,
  NaturalOccurrenceRegionHeader,
  NaturalOccurrenceRegionRow,
  sortNaturalOccurrenceRegions,
  validateNaturalOccurrenceRegionFormToReadDataDiff,
} from './NaturalOccurrenceRegionsSection';

export type SectionSlug = 'popular-names' | 'taxonomy' | 'natural-occurrence-regions';

export type ContentForm<WriteT> = Omit<WriteT, keyof ContentWriteRequestData | 'plantId'>;

export interface ContentDisplayRowProps<ReadT extends ContentReadData> extends TableTdProps {
  data: ReadT,
}

export interface ContentFormRowProps<ReadT extends ContentReadData, WriteT extends ContentWriteRequestData> {
  forms: UseFormReturnType<ContentForm<WriteT>>[],
  setForms: React.Dispatch<React.SetStateAction<UseFormReturnType<ContentForm<WriteT>>[]>>,
  contentsQueryOptions: QueryOptions<ReadT[]>,
}

export interface BuildWriteRequestDataProps<WriteT> {
  formValues: ContentForm<WriteT>,
  plantId: number,
  sourceId: number,
  contentProposerComment?: string,
}

export interface SectionConfig<ReadT extends ContentReadData, WriteT extends ContentWriteRequestData> {
  sectionName: string,
  buildQueryOptions: (plantId: number) => QueryOptions<ReadT[]>,
  sortReadData?: (a: ReadT, b: ReadT) => number,
  Header: ComponentType,
  DisplayRow: ComponentType<ContentDisplayRowProps<ReadT>>,
  FormRow: ComponentType<ContentFormRowProps<ReadT, WriteT>>,
  formUniqueKey: (keyof ContentForm<WriteT>)[],
  validateFormToReadDataDiff: (formValues: ContentForm<WriteT>, readData: ReadT, errMsg: string) => FormErrors,
  buildWriteRequestData: (props: BuildWriteRequestDataProps<WriteT>) => WriteT,
  createMutationFunction: (data: WriteT) => Promise<ContentWriteResponseData>,
  deleteMutationFunction: (contentId: number) => Promise<GenericResponse>,
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
        buildQueryOptions: buildTaxonListQueryOptions,
        Header: TaxonHeader,
        DisplayRow: TaxonRow,
        FormRow: TaxonFormRow,
        formUniqueKey: taxonFormUniqueKey,
        validateFormToReadDataDiff: validateTaxonFormToReadDataDiff,
        buildWriteRequestData: buildTaxonWriteRequestData,
        createMutationFunction: createTaxon,
        deleteMutationFunction: deleteTaxon,
      } as SectionConfig<TaxonReadData, TaxonWriteRequestData>;
    case 'popular-names':
      return {
        sectionName: 'Nomes Populares',
        buildQueryOptions: buildPopularNameListQueryOptions,
        Header: PopularNameHeader,
        DisplayRow: PopularNameRow,
        FormRow: PopularNameFormRow,
        formUniqueKey: popularNameFormUniqueKey,
        validateFormToReadDataDiff: validatePopularNameFormToReadDataDiff,
        buildWriteRequestData: buildPopularNameWriteRequestData,
        createMutationFunction: createPopularName,
        deleteMutationFunction: deletePopularName,
      } as SectionConfig<PopularNameReadData, PopularNameWriteRequestData>;
    case 'natural-occurrence-regions':
      return {
        sectionName: 'Regiões de Ocorrência Natural',
        buildQueryOptions: buildNaturalOccurrenceRegionListQueryOptions,
        sortReadData: sortNaturalOccurrenceRegions,
        Header: NaturalOccurrenceRegionHeader,
        DisplayRow: NaturalOccurrenceRegionRow,
        FormRow: NaturalOccurrenceRegionFormRow,
        formUniqueKey: naturalOccurrenceRegionFormUniqueKey,
        validateFormToReadDataDiff: validateNaturalOccurrenceRegionFormToReadDataDiff,
        buildWriteRequestData: buildNaturalOccurrenceRegionWriteRequestData,
        createMutationFunction: createNaturalOccurrenceRegion,
        deleteMutationFunction: deleteNaturalOccurrenceRegion,
      } as SectionConfig<NaturalOccurrenceRegionReadData, NaturalOccurrenceRegionWriteRequestData>;
  }
}
