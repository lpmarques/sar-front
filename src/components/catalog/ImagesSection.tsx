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

import { useEffect, useState } from 'react';
import { Alert, FileInput, Image, ImageProps, Stack, Table, Text, Tooltip } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconInfoCircle } from '@tabler/icons-react';
import { getPlantImageList, ImageReadData, ImageWriteRequestData } from '../../apis/catalog';
import { QueryOptions } from '../../apis/common';
import { Optionalize } from '../../utils/common';
import { BuildWriteRequestDataProps, ContentDisplayRowProps, ContentForm, ContentFormRowProps } from './SectionConfigs';
import { openModal } from '@mantine/modals';
import classes from '../common/Clickable.module.css';

export function ImageSectionInfo() {
  return (
    <Alert variant="light" color="blue" title="Imagens" icon={<IconInfoCircle />}>
      <Text fz="md" pb={10}>As imagens são fotografias de um exemplar vivo da planta, podendo apresentar a planta inteira ou partes dela (folhas, flores, frutos, etc.).</Text>
    </Alert>
  )
}

export function buildImageListQueryOptions(plantId: number): QueryOptions<ImageReadData[]> {
  return {
    queryKey: [
      'plantImageList',
      String(plantId),
      'status=accepted,proposed',
      'with_user_endorsement_info=true',
    ],
    queryFn: getPlantImageList,
  } as QueryOptions<ImageReadData[]>;
}

export function buildImageWriteRequestData({
  formValues,
  plantId,
  sourceId,
  contentProposerComment
}: BuildWriteRequestDataProps<ImageWriteRequestData>): ImageWriteRequestData {
  return {
    ...formValues,
    plantId: plantId,
    sourceId: sourceId,
    contentProposerComment: contentProposerComment,
  }
}

function ImageDisplay(props: ImageProps) {
  const handleOpenModal = () => {
    openModal({
      size: 'auto',
      padding: 0,
      centered: true,
      radius: 5,
      styles: {
        content: { position: 'relative' },
        header: {
          position: 'absolute',
          top: 0,
          right: 0,
          minHeight: 'auto',
          padding: 8,
          paddingInlineEnd: 8,
          backgroundColor: 'transparent',
        },
      },
      children: (
        <Image src={props.src} fit="contain" />
      ),
    });
  };

  return (
    <Image
      src={props.src}
      h={200}
      fit="contain"
      onClick={handleOpenModal}
      className={classes.icon}
      {...props}
    />
  );
}

export function ImageHeader() {
  const font = {
    fz: "h6",
    fw: 550,
  }
  
  return (
    <Table.Th {...font} w={200}>Imagem</Table.Th>
  );
}

export function ImageRow({ data, ...tableTdProps }: ContentDisplayRowProps<ImageReadData>) {
  return (
    <Table.Td {...tableTdProps}>
      <ImageDisplay src={data.url}/>
    </Table.Td>
  )
}

export type ImageForm = ContentForm<ImageWriteRequestData>; 

export const imageFormKeys = [
  'image',
] as (keyof ImageForm)[];

export function useImageForm({
  initialValues,
  onValuesChange,
}: {
  initialValues?: Optionalize<ImageWriteRequestData, 'image'>,
  onValuesChange?: (values: ImageForm, previous: ImageForm) => void,
} = {}) {
  const defaultInitial = {
    image: new File([], ''),
  };

  return useForm<ImageForm>({
    initialValues: {
      ...defaultInitial,
      ...initialValues,
    },
    onValuesChange,
    validate: {
      image: (value) => {
        if (!value || value.size === 0) return 'Campo obrigatório';
      },
    },
  });
}

export function ImageFormRow({ forms, setForms }: ContentFormRowProps<ImageReadData, ImageWriteRequestData>) {
  const form = useImageForm();

  const selectedImage = form.values.image;
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    setForms([...forms, form]);
  }, []);

  useEffect(() => {
    if (!selectedImage || selectedImage.size === 0) {
      setPreviewUrl(undefined);
      return;
    }

    const url = URL.createObjectURL(selectedImage);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [selectedImage]);

  return (
    <Table.Td>
      <Stack>
        <Tooltip withArrow label="Clique para escolher a imagem">
          <FileInput
            key={form.key('image')}
            {...form.getInputProps('image')}
          />
        </Tooltip>
        {previewUrl
          ? <ImageDisplay src={previewUrl}/>
          : undefined}
      </Stack>
    </Table.Td>
  )
}
