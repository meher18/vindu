const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/menu.tsx';
let code = fs.readFileSync(path, 'utf8');

const oldMapStart = `                  const planMenu = menus?.find(m => m.subscription_id === plan.id && m.effective_date === selectedDate);
                  const isPlanned = !!planMenu;`;

const newMapStart = `                  const planMenu = menus?.find(m => m.subscription_id === plan.id && m.effective_date === selectedDate);
                  const isPlanned = !!planMenu;
                  
                  const isTimeLocked = (() => {
                    if (isSelectedPast) return true;
                    if (selectedDate > todayStr) return false;
                    if (!plan.slot_target_time) return false;
                    const [h, m, s] = plan.slot_target_time.split(':').map(Number);
                    const target = new Date();
                    target.setHours(h, m, s, 0);
                    const cutoff = new Date(target.getTime() - 60 * 60 * 1000);
                    return new Date() > cutoff;
                  })();`;

code = code.replace(oldMapStart, newMapStart);

const oldActions = `                    {!isSelectedPast && (
                      <View style={styles.actionRow}>
                        {isSelectedPast ? (
                          <View style={[styles.editBtn, { opacity: 0.5 }]}>
                            <Text style={styles.editBtnText}>🔒 Historical Record</Text>
                          </View>
                        ) : isHoliday ? (
                          <View style={[styles.editBtn, { opacity: 0.5 }]}>
                            <Text style={styles.editBtnText}>🔒 Kitchen Closed</Text>
                          </View>
                        ) : (
                          <TouchableOpacity style={styles.editBtn} onPress={() => handleEditMeal(planMenu)}>
                            <Text style={styles.editBtnText}>✏️ Edit Menu</Text>
                          </TouchableOpacity>
                        )}
                        
                        {!isSelectedPast && selectedDate !== todayStr && (
                          <TouchableOpacity style={styles.deleteBtn} onPress={() => Alert.alert('Delete Menu?', 'Remove this menu?', [{text: 'Cancel'}, {text: 'Delete', style: 'destructive', onPress: () => deleteMenu.mutate(planMenu.id)}])}>
                            <Text style={styles.deleteBtnText}>🗑️</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}`;

const newActions = `                    {(!isSelectedPast || isTimeLocked) && (
                      <View style={styles.actionRow}>
                        {isSelectedPast ? (
                          <View style={[styles.editBtn, { opacity: 0.5 }]}>
                            <Text style={styles.editBtnText}>🔒 Historical Record</Text>
                          </View>
                        ) : isHoliday ? (
                          <View style={[styles.editBtn, { opacity: 0.5 }]}>
                            <Text style={styles.editBtnText}>🔒 Kitchen Closed</Text>
                          </View>
                        ) : isTimeLocked ? (
                          <View style={[styles.editBtn, { opacity: 0.5, backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1 }]}>
                            <Text style={[styles.editBtnText, { color: '#DC2626' }]}>🔒 Locked for Prep</Text>
                          </View>
                        ) : (
                          <TouchableOpacity style={styles.editBtn} onPress={() => handleEditMeal(planMenu)}>
                            <Text style={styles.editBtnText}>✏️ Edit Menu</Text>
                          </TouchableOpacity>
                        )}
                        
                        {!isSelectedPast && !isTimeLocked && (
                          <TouchableOpacity style={styles.deleteBtn} onPress={() => Alert.alert('Delete Menu?', 'Remove this menu?', [{text: 'Cancel'}, {text: 'Delete', style: 'destructive', onPress: () => deleteMenu.mutate(planMenu.id)}])}>
                            <Text style={styles.deleteBtnText}>🗑️</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}`;

code = code.replace(oldActions, newActions);

const oldUnplanned = `                  <View style={styles.unplannedContent}>
                    {!isSelectedPast && !isHoliday ? (
                      <TouchableOpacity style={styles.planActionBtn} onPress={() => handlePlanMeal(plan.id)}>
                        <Text style={styles.planActionText}>+ Plan this meal</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.pastUnplannedText}>No menu was published for this day.</Text>
                    )}
                  </View>`;

const newUnplanned = `                  <View style={styles.unplannedContent}>
                    {!isSelectedPast && !isHoliday && !isTimeLocked ? (
                      <TouchableOpacity style={styles.planActionBtn} onPress={() => handlePlanMeal(plan.id)}>
                        <Text style={styles.planActionText}>+ Plan this meal</Text>
                      </TouchableOpacity>
                    ) : isTimeLocked && !isSelectedPast ? (
                      <Text style={[styles.pastUnplannedText, { color: '#DC2626', fontWeight: 'bold' }]}>🔒 Time window closed. Menu was not published.</Text>
                    ) : (
                      <Text style={styles.pastUnplannedText}>No menu was published for this day.</Text>
                    )}
                  </View>`;

code = code.replace(oldUnplanned, newUnplanned);

fs.writeFileSync(path, code);
