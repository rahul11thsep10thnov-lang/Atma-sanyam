from app.schemas.analysis import LessonAnalysisResult
from app.schemas.example import GeneratedExample
from app.schemas.lesson import TeachingPlan
from app.services.ai.example_transformation_service import ExampleTransformationService
from app.services.ai.lesson_analysis_service import LessonAnalysisService
from app.services.ai.mock_provider import MockLLMProvider
from app.services.ai.prompt_service import PromptService
from app.services.ai.teaching_plan_service import TeachingPlanService


def test_prompt_service_renders_distinct_templates():
    """Regression test: the mock provider dispatches on unique phrases in
    each rendered prompt. This guards against the shared system prompt
    boilerplate ("...new examples.") accidentally colliding with another
    template's marker phrase ("new example")."""
    prompts = PromptService()
    analysis_prompt = prompts.render("lesson_analysis", source_material="x")
    example_prompt = prompts.render("example_transformation", original_example="x", formula="y")
    script_prompt = prompts.render("teaching_script", analysis={}, example={})

    assert "lesson_analysis json" in analysis_prompt.user_prompt.lower()
    assert "propose a new example" in example_prompt.user_prompt.lower()
    assert "teaching_script json" in script_prompt.user_prompt.lower()
    # The shared system prompt's "new examples" must not falsely trigger the
    # example_transformation branch when rendering an unrelated template.
    assert "propose a new example" not in script_prompt.system_prompt.lower()


def test_mock_provider_analysis_is_structured_and_deterministic():
    provider = MockLLMProvider()
    result1 = LessonAnalysisService(provider).analyze("some source text")
    result2 = LessonAnalysisService(provider).analyze("some source text")
    assert isinstance(result1, LessonAnalysisResult)
    assert result1.model_dump() == result2.model_dump()


def test_mock_provider_example_transformation_is_verified():
    provider = MockLLMProvider()
    analysis = LessonAnalysisService(provider).analyze("x")
    from app.schemas.analysis import OriginalExample

    original = OriginalExample(**analysis.examples[0].model_dump())
    concept = analysis.concepts[0]
    example, verification = ExampleTransformationService(provider).transform(original, concept)
    assert isinstance(example, GeneratedExample)
    assert verification.verified is True


def test_mock_provider_teaching_plan_is_valid_schema():
    provider = MockLLMProvider()
    analysis = LessonAnalysisService(provider).analyze("x")
    from app.schemas.analysis import OriginalExample

    original = OriginalExample(**analysis.examples[0].model_dump())
    example, _ = ExampleTransformationService(provider).transform(original, analysis.concepts[0])
    plan = TeachingPlanService(provider).generate(analysis, example)
    assert isinstance(plan, TeachingPlan)
    assert len(plan.scenes) > 0
