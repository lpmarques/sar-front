import { useNavigate } from "react-router";
import { Avatar, UnstyledButton } from "@mantine/core";
import { UserReadData } from "../../apis/core";
import { useAuth } from "../../hooks/useAuth";

export default function UserIcon({ user }: { user: UserReadData }) {
  const auth = useAuth();
  const navigate = useNavigate();

  const path = auth.user && auth.user.id === user.id ? "/user" : `/users/${user.id}`;

  return (
    <UnstyledButton onClick={() => navigate(path)} style={{'textDecoration': 'none'}}>
      <Avatar
        mb={15}
        size={60}
        name={`${user.firstName} ${user.lastName}`}
        color="initials" />
    </UnstyledButton>
  )
}
