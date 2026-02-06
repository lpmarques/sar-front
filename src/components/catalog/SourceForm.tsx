import Ajv from "ajv";
import AjvFormats from "ajv-formats";
import { Button, Fieldset, Select } from "@mantine/core";
import { isNotEmpty, useField, UseFieldReturnType } from "@mantine/form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { isValidHttpUrl, JsonSchemaString, showMutationError } from "../../apis/common";
import { createSource, getSourceTypeList, SourceField, SourceValue, SourceFieldValueWriteData, getSourceSubtypeList, SourceTypeReadData } from "../../apis/core";
import { showError, showSuccess } from '../common/notifications';
import { CommentInput, SourceFieldValueInput } from ".";
import { QueryLoader } from "../common/QueryLoader";

export default function SourceForm({ onSubmit }: { onSubmit: Function }) {
  const typeForm: { [key: string]: UseFieldReturnType<string | undefined> } = {};

  const sourceTypes = useQuery({
    queryKey: ['sourceTypeList'],
    queryFn: getSourceTypeList,
  });

  const sourceTypeOptions = sourceTypes.data ? sourceTypes.data.map(source => ({
    value: source.id.toString(),
    label: source.name
  })) : [];

  typeForm['type'] = useField<string | undefined>({
    initialValue: undefined,
    validateOnChange: true,
    onValueChange: () => {
      typeForm['subtype'].reset();
    },
    validate: isNotEmpty('Campo obrigatório'),
    resolveValidationError: () => {
      throw showError("Há campos inválidos no formulário.", "Erro");
    },
  });

  const sourceSubtypesQueryOptions = {
    queryKey: ['sourceSubtypeList', typeForm['type'].getValue() as string ?? '0'],
    queryFn: getSourceSubtypeList,
    enabled: typeForm['type'].isDirty()
  };
  const sourceSubtypes = useQuery(sourceSubtypesQueryOptions);

  const sourceSubtypeOptions = sourceSubtypes.data ? sourceSubtypes.data.map(source => ({
    value: source.id.toString(),
    label: source.name
  })) : [];

  typeForm['subtype'] = useField<string | undefined>({
    mode: 'controlled',
    initialValue: undefined,
    validateOnChange: true,
    validate: isNotEmpty('Campo obrigatório'),
    resolveValidationError: () => {
      throw showError("Há campos inválidos no formulário.", "Erro");
    },
  });

  const selectedType = sourceTypes.data && typeForm['type'].isDirty() ? (
    sourceTypes.data.find(type => type.id === Number(typeForm['type'].getValue()))
  ) : undefined;

  const selectedSubtype = sourceSubtypes.data && sourceSubtypeOptions.length > 0 && typeForm['subtype'].isDirty() ? (
    sourceSubtypes.data.find(subtype => subtype.id === Number(typeForm['subtype'].getValue()))
  ) : undefined;

  const typeInputs = (
    <>
    <Select
      key="type"
      label="Tipo de fonte"
      data={sourceTypeOptions}
      required
      {...typeForm['type'].getInputProps()}
    />
    <QueryLoader {...sourceSubtypesQueryOptions}>
      {sourceSubtypes.data && sourceSubtypeOptions.length > 0 &&
        <Select
        key="subtype"
        label="Subtipo"
        data={sourceSubtypeOptions}
        required
        {...typeForm['subtype'].getInputProps()}
      />}
    </QueryLoader>
    </>
  )

  return (
    <>
      {typeInputs}
      {selectedType && (selectedSubtype || sourceSubtypes.data && sourceSubtypeOptions.length === 0) &&
      <SourceDataForm type={selectedType} subtype={selectedSubtype} onSubmit={onSubmit} />}
    </>
  )
}

function SourceDataForm({ type, subtype, onSubmit }: { type: SourceTypeReadData, subtype?: SourceTypeReadData, onSubmit: Function }) {
  const ajv = AjvFormats(new Ajv());

  const unsortedFields = subtype ? type.fields.concat(subtype.fields) : type.fields;
  const fields = unsortedFields.sort((a, b) => a.position - b.position);

  const valuesForm = Object.fromEntries(fields.map(field => [
    field.id,
    useField<SourceValue | undefined>({
      initialValue: undefined,
      validate: (value) => validateFieldValue(field, value),
    })
  ]));

  const notesMaxChars = 300;
  const notesField = useField<string>({
    initialValue: '',
    validateOnChange: true,
    validate: (value) => {
      if (value.length > notesMaxChars) return 'Observações ultrapassam o limite máximo de caracteres';
    }
  });
  
  const validateFieldValue = (field: SourceField, value: SourceValue | undefined) => {
    if (value === undefined || 
      field.schema.type === "string" && (value as string).trim().length === 0 ||
      field.schema.type === "array" && (value as any[]).length === 0) {
      return field.isNullable ? null : 'Campo obrigatório';
    }

    if (field.schema.type === "string") {
      const schema = field.schema as JsonSchemaString;
      const str = value as string;
      if (schema.format === "uri" && !isValidHttpUrl(str.trim()))
        return 'URL inválida';
      if (schema.format === "date" && new Date(str) > new Date())
        return 'Data inválida';
    }
    
    const validate = ajv.compile(field.schema);
    if (!validate(value))
      return ajv.errorsText(validate.errors);
  }

  const transformFieldValue = (field: SourceField, value: SourceValue | undefined) => {
    if (value && field.schema.type === "string") {
      const trimmed = (value as string).trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }

    return value;
  }

  const sourceCreation = useMutation({
    mutationFn: createSource,
    onSuccess: (data) => {
      showSuccess(data.msg);
      onSubmit(data.sourceId);
    },
    onError: showMutationError
  });

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();

    const valueErrors: React.ReactNode[] = [];
    for (const field of Object.values(valuesForm)) {
      const error = await field.validate();
      if (error) valueErrors.push(error);
    }
    const noteError = await notesField.validate();

    if (valueErrors.length > 0 || noteError)
      throw showError("Há campos inválidos no formulário.", "Erro");

    const typeId = subtype?.id ?? type.id;
    const fieldValues = fields.reduce((result: SourceFieldValueWriteData[], field) => {
      let value = transformFieldValue(field, valuesForm[field.id].getValue());
      if (value) {
        result.push({
          fieldId: field.id,
          value: value,
        })
      }
      return result;
    }, []);
    const notes = notesField.getValue().trim();

    sourceCreation.mutate({
      typeId: typeId,
      fieldValues: fieldValues,
      creatorNotes: notes.length > 0 ? notes : undefined,
    });
  }

  const valueInputs = fields.map(field => (
    <SourceFieldValueInput key={field.id} sourceField={field} formField={valuesForm[field.id]} />
  ))

  return (
    <>
      <Fieldset legend="Dados da fonte" mt={10}>
        {valueInputs}
      </Fieldset>
      <CommentInput
        field={notesField}
        maxChars={notesMaxChars}
        size="sm"
        label="Observações (opcional)"
        placeholder="Suas observações sobre essa fonte"
      />
      <Button mt={10} type="submit" onClick={handleSubmit} loading={sourceCreation.isPending}>Cadastrar fonte</Button>
    </>
  )
}
