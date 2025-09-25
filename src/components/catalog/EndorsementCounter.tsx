import { useState } from 'react';
import { Group, GroupProps, Text, TextProps, UnstyledButton } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconProps, IconThumbUp, IconThumbUpFilled } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { showError, showSuccess } from '../common/notifications';
import { showMutationError } from "../../apis/common";
import {
  ContentReadData,
  createEndorsement,
  deleteEndorsement,
  getEndorsements,
  getUserEndorsements,
} from '../../apis/core';
import { useAuth } from "../../hooks/useAuth";
import { EndorsementList } from '.';

interface EndorsementCounterProps<ReadT extends ContentReadData> extends Omit<GroupProps, 'content'> {
  content: ReadT,
  textProps?: TextProps,
  iconProps?: IconProps,
};

export default function EndorsementCounter<ReadT extends ContentReadData>({ 
  content,
  textProps,
  iconProps,
  ...groupProps
}: EndorsementCounterProps<ReadT>) {

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [ clicked, setClicked ] = useState(false);

  const endorsementsQueryOptions = {
    queryKey: ['endorsements', content.contentId.toString()],
    queryFn: getEndorsements,
    refetchOnMount: true,
    enabled: clicked || content.endorsementsCount === undefined,
  };

  const userEndorsementsQueryOptions = {
    queryKey: ['userEndorsements', content.contentId.toString()],
    queryFn: getUserEndorsements,
    refetchOnMount: true,
    enabled: clicked || content.userEndorsementId === undefined,
  };

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: userEndorsementsQueryOptions.queryKey });
    queryClient.invalidateQueries({ queryKey: endorsementsQueryOptions.queryKey });
  }

  const endorsements = useQuery(endorsementsQueryOptions);
  const count = endorsements.data ? endorsements.data.length : content.endorsementsCount!;
  
  const userEndorsements = useQuery(userEndorsementsQueryOptions);
  const userEndorsementId = userEndorsements.data ? 
    (userEndorsements.data.length > 0 ? userEndorsements.data[0].id : undefined) : 
    content.userEndorsementId;
  const ThumbIcon = userEndorsementId ? IconThumbUpFilled : IconThumbUp;

  const endorsementCreation = useMutation({
    mutationFn: createEndorsement,
    onSuccess: (data) => {
      showSuccess(data.msg);
      invalidateQueries();
      if (!clicked)
        setClicked(true);
    },
    onError: showMutationError
  });
  
  const endorsementDeletion = useMutation({
    mutationFn: deleteEndorsement,
    onSuccess: (data) => {
      showSuccess(data.msg);
      invalidateQueries();
      if (!clicked)
        setClicked(true);
    },
    onError: showMutationError
  });

  const handleThumbClick = () => {
    if (!user) {
      showError("É preciso estar logado para executar essa ação.", null);
      window.open('/login', '_blank');
      return;
    }

    if (user.id == content.contentProposer!.id)
      return showError("Somente outro usuário pode aprovar conteúdo criado por você.", null);

    if (userEndorsementId)
      endorsementDeletion.mutate(userEndorsementId);
    else {
      endorsementCreation.mutate({
        contentId: content.contentId,
      });
    }
  }

  const openEndorsementListModal = () => modals.open({
    title: "Usuários que aprovaram a informação",
    children: <EndorsementList contentId={content.contentId} />
  });

  return (
    <Group justify="center" gap={25} {...groupProps}>
      <UnstyledButton onClick={openEndorsementListModal}>
        <Text fz="h2" {...textProps}>{count}</Text>
      </UnstyledButton>
      <UnstyledButton mt={5} onClick={handleThumbClick}>
        <ThumbIcon size={25} {...iconProps} />
      </UnstyledButton>
    </Group>
  )
}
