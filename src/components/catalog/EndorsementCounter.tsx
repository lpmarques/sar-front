import { useEffect, useState } from 'react';
import { Group, GroupProps, Text, TextProps, UnstyledButton } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconProps, IconThumbUp, IconThumbUpFilled } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { showError, showSuccess } from '../common/notifications';
import { showMutationError } from "../../apis/common";
import {
  createEndorsement,
  deleteEndorsement,
  getEndorsements,
  getUserEndorsements,
  UserReadData
} from '../../apis/core';
import { useAuth } from "../../hooks/useAuth";
import { QueryLoader } from '../common/QueryLoader';
import { EndorsementList } from '.';

interface EndorsementCounterProps extends GroupProps {
  contentId: number,
  contentProposer: UserReadData,
  textProps?: TextProps,
  iconProps?: IconProps,
};

export default function EndorsementCounter({ contentId, contentProposer, textProps, iconProps, ...groupProps }: EndorsementCounterProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const endorsementsQueryOptions = {
    queryKey: ['endorsements', contentId.toString()],
    queryFn: getEndorsements,
    refetchOnMount: true,
  };

  const userEndorsementsQueryOptions = {
    queryKey: ['userEndorsements', contentId.toString()],
    queryFn: getUserEndorsements,
    refetchOnMount: true,
  };

  const endorsements = useQuery(endorsementsQueryOptions);
  const count = endorsements.data ? endorsements.data.length : 0;

  const userEndorsements = useQuery(userEndorsementsQueryOptions);
  const userEndorsementId = userEndorsements.data && userEndorsements.data.length > 0 ? userEndorsements.data[0].id : undefined;
  const ThumbIcon = userEndorsementId ? IconThumbUpFilled : IconThumbUp;
  
  const endorsementCreation = useMutation({
    mutationFn: createEndorsement,
    onSuccess: (data) => {
      showSuccess(data.msg);
      invalidateQueries();
    },
    onError: showMutationError
  });
  
  const endorsementDeletion = useMutation({
    mutationFn: deleteEndorsement,
    onSuccess: (data) => {
      showSuccess(data.msg);
      invalidateQueries();
    },
    onError: showMutationError
  });

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: userEndorsementsQueryOptions.queryKey });
    queryClient.invalidateQueries({ queryKey: endorsementsQueryOptions.queryKey });
  }

  const handleThumbClick = () => {
    if (!user) {
      window.open('/login', '_blank');
      throw showError("É preciso estar logado para executar essa ação.", null);
    }

    if (user.id == contentProposer.id)
      throw showError("Somente outro usuário pode aprovar conteúdo criado por você.", null);

    if (userEndorsementId)
      endorsementDeletion.mutate(userEndorsementId)
    else {
      endorsementCreation.mutate({
        contentId: contentId,
      })
    }
  }

  const openEndorsementListModal = (contentId: number) => modals.open({
    title: "Usuários que aprovaram a versão",
    children: <EndorsementList contentId={contentId} />
  });

  return (
    <QueryLoader {...userEndorsementsQueryOptions}>
      <Group justify="center" gap={25} {...groupProps}>
        <UnstyledButton onClick={() => openEndorsementListModal(contentId)}>
          <Text fz="h2" {...textProps}>{count}</Text>
        </UnstyledButton>
        <UnstyledButton mt={5} onClick={handleThumbClick}>
          <ThumbIcon size={25} {...iconProps} />
        </UnstyledButton>
      </Group>
    </QueryLoader>
  )
}
