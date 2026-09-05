const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/menu.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Fix the main upsert payload
const oldUpsert = `      const payload: any = {
        subscription_id: editingPlanId,
        effective_date: selectedDate,
        items: filteredItems,
        notes: menuNotes.trim() || null,
        status: 'active'
      };`;
const newUpsert = `      const payload: any = {
        kitchen_id: kitchen?.id,
        subscription_id: editingPlanId,
        effective_date: selectedDate,
        items: filteredItems,
        notes: menuNotes.trim() || null,
        status: 'active'
      };`;
code = code.replace(oldUpsert, newUpsert);

// 2. Fix the autofill insert payload
const oldInsert = `          if (pastMenuToCopy) {
            inserts.push({
              subscription_id: plan.id,
              effective_date: targetStr,
              items: pastMenuToCopy.items,
              notes: pastMenuToCopy.notes || null,
              status: 'active'
            });
          }`;
const newInsert = `          if (pastMenuToCopy) {
            inserts.push({
              kitchen_id: kitchen?.id,
              subscription_id: plan.id,
              effective_date: targetStr,
              items: pastMenuToCopy.items,
              notes: pastMenuToCopy.notes || null,
              status: 'active'
            });
          }`;
code = code.replace(oldInsert, newInsert);

fs.writeFileSync(path, code);
