export type ResourceType = 'BOX' | 'SALA_GIMNASIO' | 'EQUIPO_ESPECIAL' | 'OTRO';

export interface Resource {
  id: string;
  name: string; // ej: "Box 1", "Box 2"
  type: ResourceType;
  active: boolean;
}

export const DEFAULT_RESOURCES: Resource[] = [
  { id: 'res_box_1', name: 'Box 1', type: 'BOX', active: true },
  { id: 'res_box_2', name: 'Box 2', type: 'BOX', active: true },
  { id: 'res_gym', name: 'Gimnasio de rehabilitación', type: 'SALA_GIMNASIO', active: true },
];
