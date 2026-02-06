import { useQuery } from "@tanstack/react-query";
import { Container, Paper, Table, Text, Tooltip } from "@mantine/core";
import { FarmReadData, getFarmList } from "../../apis/agroforestry";
import ClickableRow from "../common/ClickableRow";
import { showError } from "../common/notifications";
import { QueryLoader } from "../common/QueryLoader";
import AddRow from "../common/AddRow";
import { StickyHeaderTable } from "../common/StickyHeaderTable";
import { useNavigate } from 'react-router';
import { useAuth } from "../../hooks";

export default function FarmList() {
  const { user } = useAuth();
  const isLogged = user !== null;

  const farmsQueryOptions = {
    queryKey: [ 'farmList' ],
    queryFn: getFarmList,
    enable: isLogged,
  };
  const farms = useQuery(farmsQueryOptions);

  return (
    <>
    { isLogged ?
      <QueryLoader {...farmsQueryOptions}>
      {farms.data &&
        <FarmsTable farms={farms.data}/>}
      </QueryLoader> :
      <FarmsTable farms={[]}/>
    }
    </>
  )
}

function FarmsTable({ farms }: { farms: FarmReadData[] }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleRowClick = (farm: FarmReadData) => {
    navigate(farm.id.toString());
  }
  
  const handleAddRowClick = () => {
    if (!user) {
      showError("É preciso estar logado para executar essa ação.", null);
      return navigate('/login');
    }

    navigate('new');
  };

  const header = (
    <Table.Tr>
      <Table.Th>Nome</Table.Th>
      <Table.Th>País</Table.Th>
      <Table.Th>Estado</Table.Th>
      <Table.Th>Município</Table.Th>
      <Table.Th>Área (m²)</Table.Th>
    </Table.Tr>
  );

  const rows = farms.map((farm: FarmReadData) => (
    <ClickableRow
      key={farm.name}
      onClick={() => handleRowClick(farm)}
      style={{'--hover-color': '#bef7ce'}}
    >
      <Table.Td>{farm.name}</Table.Td>
      <Table.Td>{farm.country.name}</Table.Td>
      <Table.Td>{farm.state?.code}</Table.Td>
      <Table.Td>{farm.municipality?.name}</Table.Td>
      <Table.Td>{farm.areaM2}</Table.Td>
    </ClickableRow>
  ));

  rows.push(
    <Tooltip key={0} withArrow position="top" label="Clique para cadastrar uma nova propriedade.">
      <AddRow colSpan={5} onClick={() => handleAddRowClick()} style={{'--hover-color': '#bef7ce'}}/>
    </Tooltip>,
    <Table.Tr key={-1}>
      <Table.Td colSpan={5}>
        <Text c="dimmed" fw={500} ta="center">
          {rows.length > 0 ? `${rows.length} propriedade(s) cadastrada(s)` : "Nenhuma propriedade cadastrada"}
        </Text>
      </Table.Td>
    </Table.Tr>,
  );

  return (
    <Container size={1200}>
      <Text fz="h3" fw={600} mb={20}>Lista de Propriedades</Text>
      <Paper withBorder>
        <StickyHeaderTable
          header={header}
          rows={rows}
          scrollWidth={600}
          scrollHeight={550}
          striped
          stripedColor="#f0f2f2"
          withRowBorders={false}
        />
      </Paper>
    </Container>
  )
}