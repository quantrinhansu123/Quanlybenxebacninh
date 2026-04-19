const fs = require('fs');

function processCapPhep() {
  const file = 'D:\\Quanlybenxebacninh\\client\\src\\hooks\\useCapPhepDialog.ts';
  let code = fs.readFileSync(file, 'utf8');

  // 1. Remove imports
  code = code.replace(/import \{\n\s*fetchSchedulesFromAppsheetTbJoin,\n\s*type TbJoinScheduleDiagnostics,\n\} from "@\/services\/appsheet-fetch-schedules-tb-join";\n?/g, '');
  code = code.replace(/import \{ fetchXeCapacitiesFromAppsheetByPlate \} from "@\/services\/appsheet-seat-from-xe";\n?/g, '');
  code = code.replace(/,\n\s*type ScheduleDataSource/g, '');
  code = code.replace(/,\n\s*type ScheduleAppSheetFetchStepRow/g, '');
  code = code.replace(/,\n\s*type AppSheetScheduleProgressEvent/g, '');

  // 2. Remove states
  code = code.replace(/const \[isUsingAppsheetSchedules, setIsUsingAppsheetSchedules\] = useState\(false\);\n?\s*/g, '');
  code = code.replace(/const \[scheduleDataSource, setScheduleDataSource\] = useState<ScheduleDataSource>\("database"\);\n?\s*/g, '');
  code = code.replace(/const \[isLoadingTbJoinSchedules, setIsLoadingTbJoinSchedules\] = useState\(false\);\n?\s*/g, '');
  code = code.replace(/const \[scheduleFetchSteps, setScheduleFetchSteps\] = useState<ScheduleAppSheetFetchStepRow\[\]>\(\[\]\);\n?\s*/g, '');
  code = code.replace(/const \[scheduleTbDiagnostics, setScheduleTbDiagnostics\] = useState<TbJoinScheduleDiagnostics \| null>\(\n\s*null,\n\s*\);\n?\s*/g, '');
  code = code.replace(/const \[isLoadingAppsheetSchedules, setIsLoadingAppsheetSchedules\] = useState\(false\);\n?\s*/g, '');

  // 3. Remove progress callback
  const progressStart = code.indexOf('const reportAppsheetScheduleProgress');
  if (progressStart !== -1) {
    const progressEnd = code.indexOf('}, []);', progressStart) + 8;
    code = code.substring(0, progressStart) + code.substring(progressEnd);
  }

  // Cache Ref type
  code = code.replace(/Record<string, \{ items: Schedule\[\]; source: "database" \| "appsheet" }>/g, 'Record<string, { items: Schedule[] }>');

  // scheduleCacheKey
  code = code.replace(/const scheduleCacheKey = \(rid: string, opId: string \| undefined, source: ScheduleDataSource\) =>\n\s*`\$\{opId \? `\$\{rid\}_\$\{opId\}` : rid\}::\$\{source\}`;/g, '');
  code = code.replace(/const scheduleCacheKey = \(rid: string, opId: string \| undefined, source: any\) =>\s*`\$\{opId \? `\$\{rid\}_\$\{opId\}` : rid\}::\$\{source\}`;/g, '');

  // 4. Update loadSchedules
  const loadSchedulesStart = code.indexOf('const loadSchedules = useCallback(');
  const loadSchedulesEnd = code.indexOf('  /**\n   * AppSheet: Ref_Tuyen');
  
  if (loadSchedulesStart !== -1 && loadSchedulesEnd !== -1) {
    const newLoadSchedules = `const loadSchedules = useCallback(
    async (rid: string, opId?: string) => {
      try {
        const cacheKey = \`\${opId ? \`\${rid}_\${opId}\` : rid}\`;
        const cached = schedulesCacheRef.current[cacheKey];
        if (cached) {
          setSchedules(cached.items);
          return;
        }

        const dbData = await scheduleService.getAll(rid, opId, true, "Đi");
        const list = Array.isArray(dbData) ? dbData : [];
        setSchedules(list);
        schedulesCacheRef.current[cacheKey] = { items: list };
      } catch (error) {
        console.error("Failed to load schedules:", error);
      }
    },
    [],
  );\n\n`;
    code = code.substring(0, loadSchedulesStart) + newLoadSchedules + code.substring(loadSchedulesEnd);
  }

  // 5. Remove loadSchedulesFromAppsheetTbJoin & handleScheduleDataSourceChange
  const tbJoinStart = code.indexOf('  /**\n   * AppSheet: Ref_Tuyen');
  const tbJoinEnd = code.indexOf('  const calculateTotal = useCallback(');
  if (tbJoinStart !== -1 && tbJoinEnd !== -1) {
    code = code.substring(0, tbJoinStart) + code.substring(tbJoinEnd);
  }

  // 6. Remove seat effects
  const seatEffectStart = code.indexOf('  /** Lấy ghế từ RTDB và AppSheet');
  const seatEffectEnd = code.indexOf('  // Auto-fill routeId:');
  if (seatEffectStart !== -1 && seatEffectEnd !== -1) {
    code = code.substring(0, seatEffectStart) + code.substring(seatEffectEnd);
  }

  // 7. Cleanup useEffects
  code = code.replace(/if \(isUsingAppsheetSchedules\) \{[\s\S]*?return;\n\s*\}/g, '');
  code = code.replace(/isUsingAppsheetSchedules,/g, '');

  // 8. Return values
  code = code.replace(/scheduleDataSource,\n?\s*/g, '');
  code = code.replace(/handleScheduleDataSourceChange,\n?\s*/g, '');
  code = code.replace(/loadSchedulesFromAppsheetTbJoin,\n?\s*/g, '');
  code = code.replace(/isLoadingTbJoinSchedules,\n?\s*/g, '');
  code = code.replace(/isLoadingAppsheetSchedules,\n?\s*/g, '');
  code = code.replace(/scheduleFetchSteps,\n?\s*/g, '');
  code = code.replace(/scheduleTbDiagnostics,\n?\s*/g, '');

  fs.writeFileSync(file, code);
}
processCapPhep();
