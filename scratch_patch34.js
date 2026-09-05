const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/plans.tsx';
let code = fs.readFileSync(path, 'utf8');

const mutateOld = `      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return [];
        return old.map((p: any) => p.id === id ? { ...p, status: 'cancelled' } : p);
      });`;
const mutateNew = `      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return [];
        return old.filter((p: any) => p.id !== id); // Instantly remove from UI
      });`;
code = code.replace(mutateOld, mutateNew);

fs.writeFileSync(path, code);
