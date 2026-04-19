const fs = require('fs');

let f = 'D:\\Quanlybenxebacninh\\client\\src\\hooks\\useChoXeVaoBenForm.ts';
let c = fs.readFileSync(f, 'utf8');

c = c.replace(/const loadSchedules = useCallback\([\s\S]*?^  \);/m, `const loadSchedules = useCallback(
    async (rid: string) => {
      const opId = vehicleOperatorId || undefined;
      try {
        const cacheKey = \`\${opId ? \`\${rid}_\${opId}\` : rid}\`;
        const hit = schedulesCacheRef.current[cacheKey];
        if (hit) {
          setSchedules(hit.items);
          return;
        }

        const data = await scheduleService.getAll(rid, opId, true, "Đi");
        const list = Array.isArray(data) ? data : [];
        setSchedules(list);
        schedulesCacheRef.current[cacheKey] = { items: list };
      } catch (error) {
        console.error("Failed to load schedules:", error);
      }
    },
    [vehicleOperatorId],
  );`);

c = c.replace(/const loadSchedulesFromAppsheetTbJoin = async \(\) => \{[\s\S]*?^  \};\n/m, '');
c = c.replace(/const handleScheduleDataSourceChange = [\s\S]*?^  \};\n/m, '');

fs.writeFileSync(f, c);
