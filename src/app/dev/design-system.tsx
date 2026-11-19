import { router } from 'expo-router';

import { Catalogo } from '@/ds/Catalogo';

export default function DesignSystem() {
  return <Catalogo onClose={() => router.back()} />;
}
