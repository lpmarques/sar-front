import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Divider, NativeSelect, Paper, Table, Text, TextInput, Tooltip } from '@mantine/core';
import { FormErrors, isNotEmpty, useField, useForm, UseFormInput, UseFormReturnType } from '@mantine/form';
import { IconCircleDashedPlus, IconX } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTaxon, PlantReadData, TaxonReadData, TaxonWriteRequestData } from '../../apis/catalog';
import { QueryOptions, showMutationError } from '../../apis/common';
import classes from '../common/Clickable.module.css';
import { showError, showSuccess } from '../common/notifications';
import { QueryLoader } from '../common/QueryLoader';
import { StickyHeaderTable } from '../common/StickyHeaderTable';
import { CommentInput, SourceSelect } from '.';
import { ContentWriteRequestData } from '../../apis/core';
import { capitalize, undefinedIfEmpty } from '../../utils/common';

type TaxonFormData = Omit<TaxonWriteRequestData, keyof ContentWriteRequestData | 'plantId'>;

type TaxaProposalForm = {
  plant: PlantReadData,
  contentsQueryOptions: QueryOptions<TaxonReadData[]>,
}

export default function TaxaProposalForm({ plant, contentsQueryOptions }: TaxaProposalForm) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const taxonCreation = useMutation({
    mutationFn: createTaxon,
    onSuccess: (data) => {
      showSuccess(data.msg);
      queryClient.invalidateQueries({ queryKey: contentsQueryOptions.queryKey });
      navigate("..", {relative: "path"});
    },
    onError: showMutationError
  });

  const { data } = useQuery(contentsQueryOptions);

  const acceptedContents = data ? data.filter(item => item.contentStatus === "accepted") : [];
  const proposedContents = data ? data.filter(item => item.contentStatus === "proposed") : [];

  const acceptedName = acceptedContents.find(item => item.taxonomicStatus === "accepted");

  const formConfig: UseFormInput<TaxonFormData> = {
    initialValues: {
      family: acceptedName?.family ?? '',
      species: '',
      subspecies: '',
      variety: '',
      taxonomicStatus: 'synonym',
    },
    validate: {
      taxonomicStatus: isNotEmpty('Campo obrigatório'),
      family: (value) => {
        if (!value.trim().length) return 'Campo obrigatório';
        if (!/^[A-Z][a-z]+$/.test(value)) return 'Formato inválido';
      },
      species: (value) => {
        if (!value.trim().length) return 'Campo obrigatório';
        if (!/^[A-Z][a-z]+\s[a-z]{2,}$/.test(value)) return 'Formato inválido';
      },
      subspecies: (value) => {
        if (value && !/^[a-z]{2,}$/.test(value)) return 'Formato inválido';
      },
      variety: (value) => {
        if (value && !/^[a-z]{2,}$/.test(value)) return 'Formato inválido';
      },
    },
    transformValues: (values) => ({
      family: capitalize(values.family),
      species: capitalize(values.species),
      subspecies: undefinedIfEmpty(values.subspecies?.trim().toLowerCase()),
      variety: undefinedIfEmpty(values.variety?.trim().toLowerCase()),
      taxonomicStatus: values.taxonomicStatus,
    })
  };
  
  const sourceField = useField<string | undefined>({
    initialValue: undefined,
    validate: isNotEmpty('Campo obrigatório')
  });

  const commentMaxChars = 300;
  const commentField = useField<string>({
    initialValue: '',
    validateOnChange: true,
    validate: (value) => {
      if (value && value.length > commentMaxChars) return 'Comentário ultrapassa o limite máximo de caracteres';
    }
  });

  const [forms, setForms] = useState<UseFormReturnType<TaxonFormData>[]>([]);
  const [rowKeys, setRowKeys] = useState<number[]>([]);

  const contentForms = forms.filter((_, index) => rowKeys.includes(index));

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();

    const comment = commentField.getValue().trim();
    contentForms.forEach((form) => {
      form.setValues(form.getTransformedValues());
    });

    const contentErrors = [ ...validateContentForms(contentForms), ...validateContentUniqueness(contentForms) ];
    const sourceError = await sourceField.validate();
    const commentError = await commentField.validate();
    if (contentErrors.length > 0 || sourceError || commentError)
      throw showError("Há campos inválidos no formulário.", "Erro");
    
    contentForms.forEach((form) => {
      taxonCreation.mutate({
        ...form.getValues(),
        plantId: plant.id,
        sourceId: Number(sourceField.getValue()),
        contentProposerComment: comment.length > 0 ? comment : undefined,
      });
    })
  }

  const handleDeleteIconClick = (index: number) => {
    setRowKeys(rowKeys.filter((key) => key !== index));
  }

  const validateContentForms = (forms: UseFormReturnType<TaxonFormData>[]) => {

    const errors = forms.reduce((acc: FormErrors[], form) => {
      // form validations
      let validation = form.validate();
      if (validation.hasErrors)
        acc.push(validation.errors);
      
      return acc;
    }, []);

    return errors;
  }

  const validateContentUniqueness = (forms: UseFormReturnType<TaxonFormData>[]) => {

    const validateValuesMatch = (a: TaxonFormData, b: TaxonFormData, compKeys: (keyof TaxonFormData)[], errMsg: string) => {
      const matchErrors = compKeys.reduce((matchErrors: FormErrors, key) => {
        if (a[key] == b[key]) // keep '==' to consider null as equal to undefined
          matchErrors[key] = errMsg;

        return matchErrors;
      }, {});

      return matchErrors;
    }

    const errors = forms.reduce((acc: FormErrors[], form, index) => {
      let values = form.getValues();
      let keys = Object.keys(values) as (keyof TaxonFormData)[];

      // uniqueness validation among forms
      for (let i=0; i<index; i++) {
        let matchErrors = validateValuesMatch(values, forms[i].getValues(), keys, "Item duplicado");
        if (Object.keys(matchErrors).length === keys.length) {
          form.setErrors(matchErrors);
          acc.push(matchErrors);
        }
      }

      // uniqueness validation between form and accepted contents
      acceptedContents.forEach((content) => {
        let matchErrors = validateValuesMatch(values, content as TaxonFormData, keys, "Idêntico a item aceito");
        if (Object.keys(matchErrors).length === keys.length) {
          form.setErrors(matchErrors);
          acc.push(matchErrors);
        }
      });

      // uniqueness validation between form and proposed contents
      proposedContents.forEach((content) => {
        let matchErrors = validateValuesMatch(values, content as TaxonFormData, keys, "Idêntico a item já proposto");
        if (Object.keys(matchErrors).length === keys.length) {
          form.setErrors(matchErrors);
          acc.push(matchErrors);
        }
      });
      
      return acc;
    }, []);

    return errors;
  }

  const handleAddBarClick = () => {
    contentForms.forEach((form) => {
      form.setValues(form.getTransformedValues());
    });
    const errors = validateContentForms(contentForms);

    if (errors.length > 0)
      throw showError("Corrija campos inválidos antes de adicionar um novo item.", "Erro");

    setRowKeys([...rowKeys, forms.length ]);
  }

  const header = <TaxonFormHeader />;
  const rows = rowKeys.map((key) => (
    <TaxonFormRow
      key={key}
      index={key}
      formConfig={formConfig}
      forms={forms}
      setForms={setForms} // passing setter is necessary since can't call useForm hook conditionally
      onDelete={handleDeleteIconClick}
      />
  ));

  const footer = (
    <Table.Tr key={-1}>
      <Tooltip withArrow label="Clique para adicionar um novo item a sua proposta." position="bottom">
        <Table.Td colSpan={10} align="center" onClick={() => handleAddBarClick()} className={classes.row}>
          <IconCircleDashedPlus color="var(--mantine-color-dark-3)" size={35}/>
        </Table.Td>
      </Tooltip>
    </Table.Tr>
  );

  const style = { backgroundColor: "#f0f2f2" };
  const divider = <Divider mt={25} mb={15} />;
  const enableSubmit = rows.length > 0;

  return (
    <QueryLoader {...contentsQueryOptions}>
      <Paper withBorder style={style} ta="center" p={15} mb={20}>
        <Text fz="h5" fw={600} pb={10}>Proposta</Text>
        <StickyHeaderTable header={header} rows={[...rows, footer]} scrollWidth={600} scrollHeight={500} headerStyle={style} />
        {divider}
        <Text fz="h5" fw={600} pb={10}>Fonte</Text>
        <SourceSelect field={sourceField} />
        {divider}
        <Text fz="h5" fw={600} pb={10}>Comentário <Text span size="sm" c="dimmed">(opcional)</Text></Text>
        <CommentInput field={commentField} maxChars={commentMaxChars} />
        {divider}
        <Button type="submit" color="teal" disabled={!enableSubmit} onClick={handleSubmit} loading={taxonCreation.isPending}>Publicar proposta</Button>
      </Paper>
    </QueryLoader>
  )
}

function TaxonFormHeader() {
  const font = {
    fz: "h6",
    fw: 550,
  }
  
  return (
    <Table.Tr>
      <Table.Th {...font} w={80}>Status taxonômico</Table.Th>
      <Table.Th {...font} w={100}>Família</Table.Th>
      <Table.Th {...font} w={170}>Espécie</Table.Th>
      <Table.Th {...font} w={50}>Subespécie</Table.Th>
      <Table.Th {...font} w={50}>Variedade</Table.Th>
      <Table.Th {...font} w={15} ></Table.Th>
    </Table.Tr>
  );
}

interface TaxonFormRowProps {
  index: number,
  formConfig: UseFormInput<TaxonFormData>,
  forms: UseFormReturnType<TaxonFormData>[],
  setForms: React.Dispatch<React.SetStateAction<UseFormReturnType<TaxonFormData>[]>>,
  onDelete: (index: number) => void,
}

function TaxonFormRow({ index, formConfig, forms, setForms, onDelete }: TaxonFormRowProps) {
  const form = useForm<TaxonFormData>(formConfig);
  useEffect(() => {
    setForms([...forms, form]);
  }, [index]);

  const statusOptions = [
    {
      value: "accepted",
      label: "NOME ACEITO"
    },
    {
      value: "synonym",
      label: "SINÔNIMO"
    }
  ];

  return (
    <>
    <Table.Tr>
      <Table.Td>
        <NativeSelect
          key={form.key('taxonomicStatus')}
          data={statusOptions}
          {...form.getInputProps('taxonomicStatus')}
          />
      </Table.Td>
      <Table.Td>
        <TextInput 
          key={form.key('family')}
          {...form.getInputProps('family')}
          />
      </Table.Td>
      <Table.Td>
        <TextInput 
          key={form.key('species')}
          {...form.getInputProps('species')}
          />
      </Table.Td>
      <Table.Td>
        <TextInput 
          key={form.key('subspecies')}
          {...form.getInputProps('subspecies')}
          />
      </Table.Td>
      <Table.Td>
        <TextInput 
          key={form.key('variety')}
          {...form.getInputProps('variety')}
          />
      </Table.Td>
      <Table.Td>
        <Button size="compact-xs" onClick={() => onDelete(index)} color="var(--mantine-color-gray-5)">
          <IconX size={15} />
        </Button>
      </Table.Td>
    </Table.Tr>
    </>
  )
}
