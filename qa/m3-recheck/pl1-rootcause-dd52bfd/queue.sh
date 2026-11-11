#!/usr/bin/env bash
cd "$(dirname "$0")"
while pgrep -f "runall.sh dd52bfd http://127.0.0.1:4417/ dd52bfd chromium" >/dev/null; do sleep 5; done
A=a_escape_tap,b_enter_tap,c2_enter_hold_autorepeat,c4_enter_hold_2s,d1_space_tap,d3_space_hold_2s,e1_escape_upgrades_open,e2_escape_market_open
B=f1_contextmenu_then_escape,f2_alert_then_escape,g1_blur_focus_events,g2_other_page_front_back,g3_escape_down_outside_up_inside,g4_enter_keyup_on_return,g5_space_keyup_on_return,g6_escape_tap_after_return,h1_focus_after_click_buy_then_enter,h2_focus_after_click_buy_then_escape
./runall.sh dd52bfd http://127.0.0.1:4417/ dd52bfd firefox $A
./runall.sh dd52bfd http://127.0.0.1:4417/ dd52bfd firefox $B
for E in chromium firefox webkit; do
 ./runall.sh 48bdb09 http://127.0.0.1:4418/ 48bdb09 $E $A
 ./runall.sh 48bdb09 http://127.0.0.1:4418/ 48bdb09 $E $B
 SHOTDIR=$PWD/../pl1-pr43-48bdb09 SIZE=1280x800 ./runall.sh 48bdb09-shots http://127.0.0.1:4418/ 48bdb09 $E a_escape_tap,c4_enter_hold_2s
done
echo QUEUEDONE >> queue.log
