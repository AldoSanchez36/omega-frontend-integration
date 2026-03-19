"use client"

import React from 'react';
import ReactSelect from 'react-select';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// It's recommended to move these interfaces to a shared types file (e.g., types/index.ts)
interface User {
  id: string;
  username: string;
}

interface Plant {
  id: string;
  nombre: string;
}

interface UserPlantSelectorProps {
  displayedUsers: User[];
  displayedPlants: Plant[];
  selectedUser: User | null;
  selectedPlant: Plant | null;
  handleSelectUser: (userId: string | '') => void;
  handleSelectPlant: (plantId: string | '') => void;
  isPlantSelectorDisabled: boolean;
}

const UserPlantSelector: React.FC<UserPlantSelectorProps> = ({
  displayedUsers,
  displayedPlants,
  selectedUser,
  selectedPlant,
  handleSelectUser,
  handleSelectPlant,
  isPlantSelectorDisabled,
}) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Selección de Usuario y Planta</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Usuario</label>
            <ReactSelect
              options={displayedUsers.map((user) => ({ value: user.id, label: user.username }))}
              value={
                selectedUser
                  ? { value: selectedUser.id, label: selectedUser.username }
                  : null
              }
              onChange={(option) => handleSelectUser(option ? option.value : '')}
              placeholder="Seleccionar usuario"
              isClearable
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Planta</label>
            <ReactSelect
              options={displayedPlants.map((plant) => ({ value: plant.id, label: plant.nombre }))}
              value={
                selectedPlant
                  ? { value: selectedPlant.id, label: selectedPlant.nombre }
                  : null
              }
              onChange={(option) => handleSelectPlant(option ? option.value : '')}
              placeholder="Seleccionar planta"
              isClearable
              isDisabled={isPlantSelectorDisabled}
              className="w-full"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserPlantSelector;
