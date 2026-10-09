<?php

namespace App\Http\Requests\Company;

use App\Models\TaskStage;
use Closure;
use Illuminate\Database\Eloquent\Builder;

/**
 * PUT /api/v1/task-stages/{stage} — the Edit Task Stage form: the same rules as Add, with the
 * name check ignoring the stage being edited ("To Do" → "TO DO" is fine). A new Order moves the
 * stage there. The route-bound stage is already limited to the current company
 * (BelongsToCompany); the policy checks ownership again.
 *
 * Unlike Add, an edit cannot take a deleted stage's name: there is no row to restore into, and
 * the (company_id, name) index still holds it — so it is a 422, not a database error.
 */
class UpdateTaskStageRequest extends StoreTaskStageRequest
{
    public function authorize(): bool
    {
        $stage = $this->route('stage');

        return $stage instanceof TaskStage && $this->user()->can('update', $stage);
    }

    protected function uniqueName(): Closure
    {
        $live = parent::uniqueName();

        return function (string $attribute, mixed $value, Closure $fail) use ($live): void {
            $failed = false;
            $live($attribute, $value, function (string $message) use ($fail, &$failed) {
                $failed = true;
                $fail($message);
            });

            if (! $failed && is_string($value) && $value !== ''
                && TaskStage::onlyTrashed()->named($value)->exists()) {
                $fail(__('A deleted stage uses this name. Add it as a new stage to restore it.'));
            }
        };
    }

    /**
     * @return Builder<TaskStage>
     */
    protected function nameQuery(string $name): Builder
    {
        /** @var TaskStage $stage */
        $stage = $this->route('stage');

        return parent::nameQuery($name)->whereKeyNot($stage->getKey());
    }
}
