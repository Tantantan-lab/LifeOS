"""The delta bound mirrors the web's deltaPctOf — the "no exploding
percentages" regression (CDP suite asserts the same rule on the home page)."""

from app.analytics import _delta


def test_zero_baseline_is_new_data():
    assert _delta(5, 0) == 100.0
    assert _delta(0, 0) == 0.0


def test_negligible_baseline_is_new_data():
    # 1 min of history vs 121 min now → +12000% is noise, not evidence
    assert _delta(121, 1) == 100.0
    # strictly below 1% counts as negligible; exactly 1% is a real (huge)
    # delta → (100-1)/1*100 = 9900, clamped
    assert _delta(100, 1) == 999.0


def test_normal_delta_untouched():
    assert _delta(121, 100) == 21.0
    assert _delta(50, 100) == -50.0


def test_extreme_deltas_clamp_at_999():
    assert _delta(1000, 50) == 999.0  # +1900% raw → clamped
    # negative deltas bottom out at -100% for positive values, so the -999
    # bound is a mirror of the web rule rather than a reachable path here
    assert _delta(1, 1000) == -99.9
