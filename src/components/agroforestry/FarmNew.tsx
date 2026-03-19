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

import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFarm } from "../../apis/agroforestry";
import { showMutationError } from "../../apis/common";
import { showSuccess } from "../common/notifications";
import { FarmForm } from ".";

export default function FarmNew() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const farmCreation = useMutation({
    mutationFn: createFarm,
    onSuccess: (data) => {
      showSuccess(data.msg);
      queryClient.invalidateQueries({ predicate: (query) => { return query.queryKey[0] === 'farmList' } });
      navigate(`/farms/${data.farmId}`);
    },
    onError: showMutationError
  });

  return (
    <FarmForm 
      mutation={farmCreation}
    />
  )
}
