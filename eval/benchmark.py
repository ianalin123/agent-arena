"""HUD.ai evaluation — benchmark agent performance across sessions (stretch goal)."""

from typing import Any


class Benchmark:
    def __init__(self, api_key: str):
        self.api_key = api_key

    async def log_session(self, session_data: dict[str, Any]) -> None:
        """Log a completed session for benchmarking."""
        # TODO: Call HUD.ai API
        # hud.log_evaluation(
        #     task=session_data["goal_type"],
        #     model=session_data["model"],
        #     metrics={
        #         "goal_achieved": session_data["success"],
        #         "time_to_goal": session_data["duration_hours"],
        #         "total_compute_cost": session_data["compute_cost"],
        #         "total_wallet_spend": session_data["wallet_spend"],
        #         "actions_taken": session_data["action_count"],
        #         "emails_sent": session_data["emails_sent"],
        #         "strategies_tried": session_data["strategy_count"],
        #     }
        # )
        pass

    async def get_model_comparison(self) -> dict[str, Any]:
        """Fetch aggregate stats across models for comparison view."""
        # TODO: Query HUD.ai for comparison data
        return {}
