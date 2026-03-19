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

import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getFarm, updateFarm } from "../../apis/agroforestry";
import { showMutationError } from "../../apis/common";
import { showSuccess } from "../common/notifications";
import { FarmForm } from ".";
import { QueryLoader } from "../common/QueryLoader";

export default function FarmEdit() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { farmId } = useParams();

  const farmQueryOptions = {
    queryKey: ['farm', farmId!],
    queryFn: getFarm
  };
  const farm = useQuery(farmQueryOptions);

  const farmUpdate = useMutation({
    mutationFn: updateFarm,
    onSuccess: (data, variables) => {
      queryClient.refetchQueries(farmQueryOptions);
      queryClient.invalidateQueries({ predicate: (query) => { return query.queryKey[0] === 'farmList' } });
      showSuccess(data.msg);
      navigate(`/farms/${variables.id}`);
    },
    onError: showMutationError
  });

  return (
    <QueryLoader {...farmQueryOptions}>
      {farm.data &&
      <FarmForm
        farm={farm.data}
        mutation={farmUpdate}
      />}
    </QueryLoader>
  )
}
