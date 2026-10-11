<?php

use App\Models\Milestone;
use App\Models\Plan;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskStage;
use App\Models\User;
use App\Support\Tenancy\Tenancy;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/* The project figures the Tasks module made real (they were honest zeros before it): the list's
   Progress column, the details' Total Tasks / "n completed", and the Overview's Project Health
   ring with its Tasks Complete and Overdue rows. Progress = tasks in a done stage ÷ all tasks. */

beforeEach(function () {
    Carbon::setTestNow('2026-10-10 12:00:00');
    $plan = Plan::factory()->create(['max_projects' => Plan::UNLIMITED]);
    $this->company = User::factory()->company()->create();
    $this->other = User::factory()->company()->create();
    foreach ([$this->company, $this->other] as $company) {
        $company->forceFill(['plan_id' => $plan->id])->save();
    }
    [$this->todo, $this->done, $this->project, $this->empty] = Tenancy::instance()->runAs($this->company, fn () => [
        TaskStage::factory()->create(['name' => 'To Do']),
        TaskStage::factory()->done()->create(['name' => 'Done']),
        Project::factory()->create(['name' => 'With tasks']),
        Project::factory()->create(['name' => 'Without tasks']),
    ]);
});

afterEach(fn () => Carbon::setTestNow());

function figureTasks(User $company, Project $project, TaskStage $stage, int $count, array $attributes = []): void
{
    Tenancy::instance()->runAs($company, fn () => Task::factory()->count($count)->create(['project_id' => $project->id, 'task_stage_id' => $stage->id, ...$attributes]));
}

function actAsFiguresUser(User $user): void
{
    test()->flushSession();
    Auth::forgetGuards();
    test()->actingAs($user, 'web');
}

test('3 tasks, 1 done → 33%, "1 completed" of 3, health Low — on the details and in the list; an empty project still reads 0%', function () {
    figureTasks($this->company, $this->project, $this->todo, 2);
    figureTasks($this->company, $this->project, $this->done, 1);
    actAsFiguresUser($this->company);

    $this->getJson(route('v1.projects.show', $this->project))->assertOk()
        ->assertJsonPath('data.progress', 33)
        ->assertJsonPath('data.figures.progress', 33)
        ->assertJsonPath('data.figures.tasks', ['total' => 3, 'completed' => 1])
        ->assertJsonPath('data.figures.health', ['value' => 'low', 'label' => 'Low']);
    $this->getJson(route('v1.projects.show', $this->empty))->assertOk()
        ->assertJsonPath('data.figures.progress', 0)
        ->assertJsonPath('data.figures.tasks', ['total' => 0, 'completed' => 0]);

    $list = collect($this->getJson(route('v1.projects.index'))->json('data'))->pluck('progress', 'name')->all();
    expect($list)->toBe(['With tasks' => 33, 'Without tasks' => 0]);
});

test('the health bands follow the real progress: 2 of 4 → 50% Medium, 3 of 4 → 75% High, 4 of 4 → 100% High', function () {
    figureTasks($this->company, $this->project, $this->todo, 2);
    figureTasks($this->company, $this->project, $this->done, 2);
    actAsFiguresUser($this->company);
    $figures = fn () => $this->getJson(route('v1.projects.show', $this->project))->json('data.figures');

    expect($figures())->progress->toBe(50)->health->toBe(['value' => 'medium', 'label' => 'Medium']);

    $todo = Task::query()->where('task_stage_id', $this->todo->id)->orderBy('id')->get();
    $this->patchJson(route('v1.tasks.move', $todo[0]), ['task_stage_id' => $this->done->id, 'position' => 1])->assertOk();
    expect($figures())->progress->toBe(75)->health->toBe(['value' => 'high', 'label' => 'High']);

    $this->patchJson(route('v1.tasks.move', $todo[1]), ['task_stage_id' => $this->done->id, 'position' => 1])->assertOk();
    expect($figures())->progress->toBe(100)->tasks->toBe(['total' => 4, 'completed' => 4]);
});

test('Overdue counts milestones past due and not completed PLUS tasks past due and not in a done stage', function () {
    $late = ['start_date' => '2026-09-01', 'due_date' => '2026-10-01'];
    figureTasks($this->company, $this->project, $this->todo, 2, $late);          // overdue
    figureTasks($this->company, $this->project, $this->done, 1, $late);          // done: not overdue
    figureTasks($this->company, $this->project, $this->todo, 1);                 // future: not overdue
    Tenancy::instance()->runAs($this->company, fn () => Milestone::factory()->for($this->project)->create(['due_date' => '2026-10-05'])); // overdue
    actAsFiguresUser($this->company);

    $this->getJson(route('v1.projects.show', $this->project))->assertJsonPath('data.figures.overdue', 3);
});

test('deleted tasks and another company\'s tasks never count', function () {
    figureTasks($this->company, $this->project, $this->done, 1);
    figureTasks($this->company, $this->project, $this->todo, 1);
    Tenancy::instance()->runAs($this->company, fn () => Task::query()->where('task_stage_id', $this->todo->id)->first()->delete());
    $foreign = Tenancy::instance()->runAs($this->other, fn () => [TaskStage::factory()->create(), Project::factory()->create()]);
    figureTasks($this->other, $foreign[1], $foreign[0], 5);
    actAsFiguresUser($this->company);

    $this->getJson(route('v1.projects.show', $this->project))->assertJsonPath('data.figures.tasks', ['total' => 1, 'completed' => 1])->assertJsonPath('data.progress', 100);
});

test('the list\'s Progress column costs one query per page, whatever the number of projects (no N+1)', function () {
    $queries = function (): int {
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson(route('v1.projects.index', ['per_page' => 100]))->assertOk();
        $count = count(DB::getQueryLog());
        DB::disableQueryLog();

        return $count;
    };
    figureTasks($this->company, $this->project, $this->done, 1);
    actAsFiguresUser($this->company);
    $few = $queries();

    $more = Tenancy::instance()->runAs($this->company, fn () => Project::factory()->count(8)->create());
    foreach ($more as $project) {
        figureTasks($this->company, $project, $this->todo, 2);
    }

    expect($queries())->toBe($few);
});
